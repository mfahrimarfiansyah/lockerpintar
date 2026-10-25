import "server-only";
import { GalatDomain } from "@/domain/galat";
import type { PinjamanAktif, SaranRegistrasi, StatusDikenal } from "@/domain/pindai";
import { prisma } from "@/lib/db";
import { penggunaUntukAksi, GalatAkses, type PenggunaSesi } from "@/lib/sesi";
import { bacaTokenScan, buatTokenScan, type IsiTokenScan } from "@/lib/token-scan";
import { batasHariIni } from "@/lib/waktu";
import { GalatSesiScan } from "./hasil";

export type ProfilKiosk = {
  peminjamId: string;
  nama: string;
  nomorSamar: string;
  pinjamanAktif: PinjamanAktif[];
  bolehPinjamLagi: boolean;
  batasHariIni: string;
};

export type Layar =
  | { layar: "registrasi"; token: string; kodeKartu: string; saran: SaranRegistrasi | null }
  | { layar: "buatPin"; token: string; nama: string }
  | { layar: "pilihLoker"; token: string; profil: ProfilKiosk }
  | { layar: "pin"; token: string; profil: ProfilKiosk }
  | { layar: "aksi"; token: string; profil: ProfilKiosk }
  | { layar: "info"; nada: "sukses" | "peringatan" | "galat"; judul: string; pesan: string; detail?: string };

export type KonteksKiosk = { pengguna: PenggunaSesi; lokasiId: string };

/** Akun kiosk memakai lokasinya sendiri; petugas/admin memilih lokasi. */
export async function konteksKiosk(lokasiIdDiminta?: string | null): Promise<KonteksKiosk> {
  const pengguna = await penggunaUntukAksi("KIOSK", "PETUGAS", "ADMIN");
  if (pengguna.peran === "KIOSK") {
    if (!pengguna.lokasiId) throw new GalatAkses("Akun kiosk ini belum dipasangkan ke lokasi.");
    return { pengguna, lokasiId: pengguna.lokasiId };
  }
  if (!lokasiIdDiminta) throw new GalatDomain("DATA_TIDAK_VALID", "Pilih lokasi terlebih dulu.");
  if (pengguna.peran === "PETUGAS" && pengguna.lokasiId && pengguna.lokasiId !== lokasiIdDiminta) {
    throw new GalatAkses("Anda hanya bertugas di lokasi Anda sendiri.");
  }
  return { pengguna, lokasiId: lokasiIdDiminta };
}

export function bacaToken(token: string, ktx: KonteksKiosk): IsiTokenScan {
  const isi = bacaTokenScan(token);
  if (!isi || isi.u !== ktx.pengguna.id || isi.l !== ktx.lokasiId) throw new GalatSesiScan();
  return isi;
}

export function tokenBaru(ktx: KonteksKiosk, isi: Pick<IsiTokenScan, "k" | "p" | "pin">) {
  return buatTokenScan({ ...isi, u: ktx.pengguna.id, l: ktx.lokasiId });
}

/** Menentukan layar berikutnya untuk anggota yang sudah dikenali. */
export async function layarUntuk(
  status: StatusDikenal,
  ktx: KonteksKiosk,
  token: Pick<IsiTokenScan, "k" | "pin">,
): Promise<Layar> {
  const lokasi = await prisma.lokasi.findUniqueOrThrow({ where: { id: ktx.lokasiId } });
  const isi = { k: token.k, p: status.peminjam.id, pin: token.pin };
  const profil: ProfilKiosk = {
    peminjamId: status.peminjam.id,
    nama: status.peminjam.nama,
    nomorSamar: status.peminjam.nomorSamar,
    pinjamanAktif: status.pinjamanAktif,
    bolehPinjamLagi: status.bolehPinjamLagi,
    batasHariIni: batasHariIni(new Date(), lokasi.zonaWaktu, lokasi.jamTutup).toISOString(),
  };

  if (status.perluBuatPin) return { layar: "buatPin", token: tokenBaru(ktx, isi), nama: status.peminjam.nama };

  if (status.pinjamanAktif.some((p) => p.diLokasiIni)) {
    if (status.wajibPin && !token.pin) return { layar: "pin", token: tokenBaru(ktx, isi), profil };
    return { layar: "aksi", token: tokenBaru(ktx, isi), profil };
  }

  if (!status.bolehPinjamLagi) {
    const pinjaman = status.pinjamanAktif.find((p) => p.terlambat) ?? status.pinjamanAktif[0];
    return {
      layar: "info",
      nada: "peringatan",
      judul: "Anda masih meminjam loker",
      pesan: pinjaman
        ? `Loker ${pinjaman.lokerKode} di ${pinjaman.lokasiNama}${pinjaman.terlambat ? " sudah lewat batas waktu" : ""}. Kembalikan dulu di lokasi tersebut.`
        : "Kembalikan loker Anda terlebih dulu.",
    };
  }

  return { layar: "pilihLoker", token: tokenBaru(ktx, isi), profil };
}
