import { z } from "zod";
import { prisma, type Tx } from "@/lib/db";
import { catatLog } from "./log";
import { GalatDomain } from "./galat";

export type NilaiPengaturan = {
  maksPinjamPerOrang: number;
  maksSalahPin: number;
  lamaKunciPinMenit: number;
  resetKioskDetik: number;
};

export const PENGATURAN_BAWAAN: NilaiPengaturan = {
  maksPinjamPerOrang: 1,
  maksSalahPin: 5,
  lamaKunciPinMenit: 5,
  resetKioskDetik: 10,
};

export async function ambilPengaturan(db: Tx | typeof prisma = prisma): Promise<NilaiPengaturan> {
  const baris = await db.pengaturan.findUnique({ where: { id: 1 } });
  if (!baris) return PENGATURAN_BAWAAN;
  return {
    maksPinjamPerOrang: baris.maksPinjamPerOrang,
    maksSalahPin: baris.maksSalahPin,
    lamaKunciPinMenit: baris.lamaKunciPinMenit,
    resetKioskDetik: baris.resetKioskDetik,
  };
}

const skemaPengaturan = z.object({
  maksPinjamPerOrang: z.coerce.number().int().min(1).max(10),
  maksSalahPin: z.coerce.number().int().min(3).max(20),
  lamaKunciPinMenit: z.coerce.number().int().min(1).max(1440),
  resetKioskDetik: z.coerce.number().int().min(3).max(120),
});

export async function simpanPengaturan(input: unknown, penggunaId: string) {
  const hasil = skemaPengaturan.safeParse(input);
  if (!hasil.success) {
    throw new GalatDomain("DATA_TIDAK_VALID", "Nilai pengaturan tidak valid. Periksa batas setiap kolom.");
  }
  await prisma.pengaturan.upsert({
    where: { id: 1 },
    create: { id: 1, ...hasil.data },
    update: hasil.data,
  });
  await catatLog({ jenis: "UBAH_DATA", penggunaId, detail: { objek: "pengaturan", ...hasil.data } });
  return hasil.data;
}
