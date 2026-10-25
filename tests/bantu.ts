import type { Prisma } from "@/generated/prisma/client";
import { GalatDomain } from "@/domain/galat";
import { prisma } from "@/lib/db";
import { hashPin } from "@/lib/hash-pin";

/** Kode galat domain dari sebuah promise, atau null bila berhasil. */
export async function kodeGalat(janji: Promise<unknown>) {
  try {
    await janji;
    return null;
  } catch (err) {
    if (err instanceof GalatDomain) return err.kode;
    throw err;
  }
}

export async function kosongkanDb() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE "LogAktivitas", "Peminjaman", "Loker", "Peminjam", "Sesi", "Akun", "Verifikasi", "Pengguna", "Lokasi", "Pengaturan" CASCADE`,
  );
}

let urut = 0;

/** Lokasi buka 00:00–23:59 WITA dengan loker A-01..A-<jumlah>. */
export async function buatLokasiUji(opsi: Partial<Prisma.LokasiCreateInput> & { jumlahLoker?: number } = {}) {
  const { jumlahLoker = 4, ...data } = opsi;
  urut++;
  const lokasi = await prisma.lokasi.create({
    data: {
      nama: `Lokasi Uji ${urut}`,
      slug: `lokasi-uji-${urut}`,
      zonaWaktu: "Asia/Makassar",
      jamBuka: "00:00",
      jamTutup: "23:59",
      modeKunci: "SIMULASI",
      wajibPin: true,
      ...data,
    },
  });
  await prisma.loker.createMany({
    data: Array.from({ length: jumlahLoker }, (_, i) => ({
      lokasiId: lokasi.id,
      kode: `A-${String(i + 1).padStart(2, "0")}`,
      blok: "A",
      baris: 1,
      kolom: i + 1,
    })),
  });
  const loker = await prisma.loker.findMany({ where: { lokasiId: lokasi.id }, orderBy: { kolom: "asc" } });
  return { lokasi, loker };
}

export async function buatPeminjamUji(opsi: Partial<Prisma.PeminjamCreateInput> & { pin?: string | null } = {}) {
  const { pin = "1234", ...data } = opsi;
  urut++;
  const nomor = `9${String(urut).padStart(9, "0")}`;
  return prisma.peminjam.create({
    data: {
      nomorInduk: nomor,
      nama: `Anggota ${urut}`,
      kodeKartu: `KARTU-${nomor}`,
      noWa: "6281200000000",
      pinHash: pin ? await hashPin(pin) : null,
      sumber: "KIOSK",
      ...data,
    },
  });
}
