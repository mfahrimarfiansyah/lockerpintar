import type { Peminjam } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { kodeKartuValid, nomorDariKodeKartu, normalisasiKodeKartu, samarkanNomor } from "@/lib/kartu";
import { GalatDomain } from "./galat";
import { ambilLokasiAktif } from "./lokasi";
import { catatLog } from "./log";
import { ambilPengaturan } from "./pengaturan";

export type PinjamanAktif = {
  id: string;
  lokerId: string;
  lokerKode: string;
  lokasiId: string;
  lokasiNama: string;
  zonaWaktu: string;
  mulaiAt: string;
  batasAt: string;
  terlambat: boolean;
  diLokasiIni: boolean;
};

export type ProfilPeminjam = {
  id: string;
  nama: string;
  nomorSamar: string;
  punyaPin: boolean;
};

export type SaranRegistrasi = {
  nomorInduk: string;
  nama: string | null;
  unit: string | null;
  dariImpor: boolean;
};

export type StatusDikenal = {
  jenis: "DIKENAL";
  peminjam: ProfilPeminjam;
  perluBuatPin: boolean;
  wajibPin: boolean;
  pinjamanAktif: PinjamanAktif[];
  bolehPinjamLagi: boolean;
};

export type HasilPindai =
  | { jenis: "TIDAK_DIKENAL"; kodeKartu: string; saran: SaranRegistrasi | null }
  | { jenis: "DIBLOKIR"; nama: string; alasan: string | null }
  | StatusDikenal;

type InputIdentifikasi = { lokasiId: string; penggunaId: string | null };

export async function pindaiKartu(
  input: InputIdentifikasi & { kodeKartu: string },
  sekarang = new Date(),
): Promise<HasilPindai> {
  const kode = normalisasiKodeKartu(input.kodeKartu);
  if (!kodeKartuValid(kode)) throw new GalatDomain("KARTU_TIDAK_VALID", "Kartu tidak terbaca. Silakan scan ulang.");
  const lokasi = await ambilLokasiAktif(input.lokasiId);
  const peminjam = await prisma.peminjam.findUnique({ where: { kodeKartu: kode } });
  if (!peminjam) {
    await catatLog({
      jenis: "SCAN",
      penggunaId: input.penggunaId,
      lokasiId: lokasi.id,
      detail: { hasil: "TIDAK_DIKENAL", kodeKartu: kode },
    });
    return { jenis: "TIDAK_DIKENAL", kodeKartu: kode, saran: await saranRegistrasi(kode) };
  }
  return setelahDikenali(peminjam, lokasi.id, input.penggunaId, sekarang, { kodeKartu: kode });
}

/** Khusus petugas: kartu rusak/tertinggal, cari dengan nomor ID. */
export async function cariDenganNomor(
  input: InputIdentifikasi & { nomorInduk: string },
  sekarang = new Date(),
): Promise<HasilPindai> {
  const nomor = input.nomorInduk.trim();
  const lokasi = await ambilLokasiAktif(input.lokasiId);
  const peminjam = await prisma.peminjam.findUnique({ where: { nomorInduk: nomor } });
  if (!peminjam) throw new GalatDomain("TIDAK_DITEMUKAN", `Anggota dengan nomor ID ${nomor} belum terdaftar.`);
  return setelahDikenali(peminjam, lokasi.id, input.penggunaId, sekarang, { manual: true });
}

async function setelahDikenali(
  peminjam: Peminjam,
  lokasiId: string,
  penggunaId: string | null,
  sekarang: Date,
  detail: Record<string, string | boolean>,
): Promise<HasilPindai> {
  if (peminjam.status === "DIBLOKIR") {
    await catatLog({
      jenis: "DITOLAK",
      penggunaId,
      peminjamId: peminjam.id,
      lokasiId,
      detail: { alasan: "DIBLOKIR", ...detail },
    });
    return { jenis: "DIBLOKIR", nama: peminjam.nama, alasan: peminjam.alasanBlokir };
  }
  await catatLog({
    jenis: "SCAN",
    penggunaId,
    peminjamId: peminjam.id,
    lokasiId,
    detail: { hasil: "DIKENAL", ...detail },
  });
  return statusPeminjamDiLokasi(peminjam.id, lokasiId, sekarang);
}

async function saranRegistrasi(kode: string): Promise<SaranRegistrasi | null> {
  const nomor = nomorDariKodeKartu(kode);
  if (!nomor) return null;
  const ada = await prisma.peminjam.findUnique({ where: { nomorInduk: nomor } });
  if (ada && !ada.kodeKartu && ada.status === "AKTIF") {
    return { nomorInduk: nomor, nama: ada.nama, unit: ada.unit, dariImpor: true };
  }
  return { nomorInduk: nomor, nama: null, unit: null, dariImpor: false };
}

export async function statusPeminjamDiLokasi(
  peminjamId: string,
  lokasiId: string,
  sekarang = new Date(),
): Promise<StatusDikenal> {
  const [peminjam, lokasi, pengaturan, aktif] = await Promise.all([
    prisma.peminjam.findUnique({ where: { id: peminjamId } }),
    ambilLokasiAktif(lokasiId),
    ambilPengaturan(),
    prisma.peminjaman.findMany({
      where: { peminjamId, selesaiAt: null },
      include: { loker: { include: { lokasi: true } } },
      orderBy: { mulaiAt: "asc" },
    }),
  ]);
  if (!peminjam) throw new GalatDomain("TIDAK_DITEMUKAN", "Data anggota tidak ditemukan.");
  if (peminjam.status === "DIBLOKIR") {
    throw new GalatDomain("DIBLOKIR", "Akun Anda diblokir. Silakan hubungi petugas.");
  }
  const pinjamanAktif: PinjamanAktif[] = aktif.map((p) => ({
    id: p.id,
    lokerId: p.lokerId,
    lokerKode: p.loker.kode,
    lokasiId: p.loker.lokasiId,
    lokasiNama: p.loker.lokasi.nama,
    zonaWaktu: p.loker.lokasi.zonaWaktu,
    mulaiAt: p.mulaiAt.toISOString(),
    batasAt: p.batasAt.toISOString(),
    terlambat: p.batasAt < sekarang,
    diLokasiIni: p.loker.lokasiId === lokasiId,
  }));
  return {
    jenis: "DIKENAL",
    peminjam: {
      id: peminjam.id,
      nama: peminjam.nama,
      nomorSamar: samarkanNomor(peminjam.nomorInduk),
      punyaPin: Boolean(peminjam.pinHash),
    },
    perluBuatPin: !peminjam.pinHash && lokasi.wajibPin,
    wajibPin: lokasi.wajibPin,
    pinjamanAktif,
    bolehPinjamLagi:
      !pinjamanAktif.some((p) => p.terlambat) && pinjamanAktif.length < pengaturan.maksPinjamPerOrang,
  };
}
