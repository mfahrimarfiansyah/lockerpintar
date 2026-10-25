"use server";

import { GalatDomain } from "@/domain/galat";
import { bukaUlang, kembalikanLoker, pinjamLoker } from "@/domain/peminjaman";
import { aturPinBaru, verifikasiPin } from "@/domain/pin";
import { cariDenganNomor, pindaiKartu, statusPeminjamDiLokasi, type HasilPindai } from "@/domain/pindai";
import { daftarkanPeminjam } from "@/domain/registrasi";
import { batasLaju } from "@/lib/batas-laju";
import { normalisasiKodeKartu } from "@/lib/kartu";
import { GalatAkses } from "@/lib/sesi";
import { formatJam } from "@/lib/waktu";
import { bungkus, GalatSesiScan, type Hasil } from "./hasil";
import { bacaToken, konteksKiosk, layarUntuk, tokenBaru, type KonteksKiosk, type Layar } from "./kiosk-bantu";

type DenganLokasi = { lokasiId?: string | null };
type DenganToken = DenganLokasi & { token: string };

function layarSetelahIdentifikasi(hasil: HasilPindai, ktx: KonteksKiosk, kodeKartu: string | null): Promise<Layar> | Layar {
  if (hasil.jenis === "TIDAK_DIKENAL") {
    return {
      layar: "registrasi",
      token: tokenBaru(ktx, { k: hasil.kodeKartu, p: null, pin: false }),
      kodeKartu: hasil.kodeKartu,
      saran: hasil.saran,
    };
  }
  if (hasil.jenis === "DIBLOKIR") {
    const untukStaf = ktx.pengguna.peran !== "KIOSK" && hasil.alasan ? ` Alasan: ${hasil.alasan}.` : "";
    return {
      layar: "info",
      nada: "galat",
      judul: "Akses ditolak",
      pesan: `Akun ${hasil.nama} sedang diblokir.${untukStaf} Silakan hubungi petugas.`,
    };
  }
  return layarUntuk(hasil, ktx, { k: kodeKartu, pin: false });
}

export async function aksiPindai(input: DenganLokasi & { kode: string }): Promise<Hasil<Layar>> {
  return bungkus(async () => {
    const ktx = await konteksKiosk(input.lokasiId);
    if (!batasLaju(`scan:${ktx.pengguna.id}`, 30, 60_000)) {
      throw new GalatDomain("DATA_TIDAK_VALID", "Terlalu banyak scan dalam waktu singkat. Tunggu sebentar.");
    }
    const kode = String(input.kode ?? "");
    const hasil = await pindaiKartu({ kodeKartu: kode, lokasiId: ktx.lokasiId, penggunaId: ktx.pengguna.id });
    return layarSetelahIdentifikasi(hasil, ktx, normalisasiKodeKartu(kode));
  });
}

/** Khusus petugas/admin: kartu rusak atau tertinggal. */
export async function aksiCariNomor(input: DenganLokasi & { nomor: string }): Promise<Hasil<Layar>> {
  return bungkus(async () => {
    const ktx = await konteksKiosk(input.lokasiId);
    if (ktx.pengguna.peran === "KIOSK") throw new GalatAkses("Pencarian nomor ID hanya untuk petugas.");
    const hasil = await cariDenganNomor({
      nomorInduk: String(input.nomor ?? ""),
      lokasiId: ktx.lokasiId,
      penggunaId: ktx.pengguna.id,
    });
    return layarSetelahIdentifikasi(hasil, ktx, null);
  });
}

export async function aksiRegistrasi(
  input: DenganToken & {
    nomorInduk: string;
    nama: string;
    unit?: string;
    noWa: string;
    pin: string;
    setuju: boolean;
  },
): Promise<Hasil<Layar>> {
  return bungkus(async () => {
    const ktx = await konteksKiosk(input.lokasiId);
    const isi = bacaToken(input.token, ktx);
    if (isi.p || !isi.k) throw new GalatSesiScan();
    const { peminjamId } = await daftarkanPeminjam({
      kodeKartu: isi.k,
      nomorInduk: input.nomorInduk,
      nama: input.nama,
      unit: input.unit,
      noWa: input.noWa,
      pin: input.pin,
      setuju: input.setuju as true,
      sumber: ktx.pengguna.peran === "KIOSK" ? "KIOSK" : "PETUGAS",
      penggunaId: ktx.pengguna.id,
      lokasiId: ktx.lokasiId,
    });
    const status = await statusPeminjamDiLokasi(peminjamId, ktx.lokasiId);
    return layarUntuk(status, ktx, { k: isi.k, pin: true });
  });
}

export async function aksiBuatPin(input: DenganToken & { pin: string }): Promise<Hasil<Layar>> {
  return bungkus(async () => {
    const ktx = await konteksKiosk(input.lokasiId);
    const isi = bacaToken(input.token, ktx);
    if (!isi.p) throw new GalatSesiScan();
    await aturPinBaru({ peminjamId: isi.p, pin: input.pin, penggunaId: ktx.pengguna.id, lokasiId: ktx.lokasiId });
    const status = await statusPeminjamDiLokasi(isi.p, ktx.lokasiId);
    return layarUntuk(status, ktx, { k: isi.k, pin: true });
  });
}

export async function aksiVerifikasiPin(input: DenganToken & { pin: string }): Promise<Hasil<Layar>> {
  return bungkus(async () => {
    const ktx = await konteksKiosk(input.lokasiId);
    const isi = bacaToken(input.token, ktx);
    if (!isi.p) throw new GalatSesiScan();
    await verifikasiPin({ peminjamId: isi.p, pin: input.pin, penggunaId: ktx.pengguna.id, lokasiId: ktx.lokasiId });
    const status = await statusPeminjamDiLokasi(isi.p, ktx.lokasiId);
    return layarUntuk(status, ktx, { k: isi.k, pin: true });
  });
}

export async function aksiPinjam(input: DenganToken & { lokerId: string | null }): Promise<Hasil<Layar>> {
  return bungkus(async () => {
    const ktx = await konteksKiosk(input.lokasiId);
    const isi = bacaToken(input.token, ktx);
    if (!isi.p) throw new GalatSesiScan();
    const hasil = await pinjamLoker({
      peminjamId: isi.p,
      lokasiId: ktx.lokasiId,
      lokerId: input.lokerId,
      penggunaId: ktx.pengguna.id,
    });
    return {
      layar: "info",
      nada: "sukses",
      judul: hasil.pesanBuka,
      pesan: "Simpan barang Anda, lalu tutup pintu loker.",
      detail: `Batas pengembalian hari ini pukul ${formatJam(hasil.batasAt, hasil.zonaWaktu)}.`,
    } satisfies Layar;
  });
}

export async function aksiBukaUlang(input: DenganToken & { peminjamanId: string }): Promise<Hasil<Layar>> {
  return bungkus(async () => {
    const ktx = await konteksKiosk(input.lokasiId);
    const isi = bacaToken(input.token, ktx);
    if (!isi.p) throw new GalatSesiScan();
    const hasil = await bukaUlang({
      peminjamId: isi.p,
      peminjamanId: input.peminjamanId,
      lokasiId: ktx.lokasiId,
      penggunaId: ktx.pengguna.id,
      pinTerverifikasi: isi.pin,
    });
    return {
      layar: "info",
      nada: "sukses",
      judul: hasil.pesanBuka,
      pesan: "Ambil atau simpan barang, lalu tutup kembali pintunya. Loker masih atas nama Anda.",
    } satisfies Layar;
  });
}

export async function aksiKembalikan(input: DenganToken & { peminjamanId: string }): Promise<Hasil<Layar>> {
  return bungkus(async () => {
    const ktx = await konteksKiosk(input.lokasiId);
    const isi = bacaToken(input.token, ktx);
    if (!isi.p) throw new GalatSesiScan();
    const hasil = await kembalikanLoker({
      peminjamId: isi.p,
      peminjamanId: input.peminjamanId,
      lokasiId: ktx.lokasiId,
      penggunaId: ktx.pengguna.id,
      pinTerverifikasi: isi.pin,
    });
    return {
      layar: "info",
      nada: "sukses",
      judul: "Peminjaman selesai",
      pesan: `${hasil.pesanBuka}. Ambil barang Anda lalu tutup pintu. Terima kasih!`,
      detail: hasil.terlambat ? "Catatan: loker dikembalikan melewati batas waktu." : undefined,
    } satisfies Layar;
  });
}
