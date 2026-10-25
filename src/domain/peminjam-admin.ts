import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { kodeKartuValid, normalisasiKodeKartu, normalisasiNoWa } from "@/lib/kartu";
import { GalatDomain } from "./galat";
import { catatLog } from "./log";

const skemaUbah = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 huruf.").max(100),
  unit: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => v || null),
  noWa: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null),
});

export async function ubahDataPeminjam(id: string, input: z.input<typeof skemaUbah>, penggunaId: string) {
  const hasil = skemaUbah.safeParse(input);
  if (!hasil.success) throw new GalatDomain("DATA_TIDAK_VALID", hasil.error.issues[0]!.message);
  let noWa: string | null = null;
  if (hasil.data.noWa) {
    noWa = normalisasiNoWa(hasil.data.noWa);
    if (!noWa) throw new GalatDomain("DATA_TIDAK_VALID", "Nomor WhatsApp tidak valid.");
  }
  await prisma.peminjam.update({
    where: { id },
    data: { nama: hasil.data.nama, unit: hasil.data.unit, noWa },
  });
  await catatLog({ jenis: "UBAH_DATA", penggunaId, peminjamId: id, detail: { objek: "anggota" } });
}

export async function blokirPeminjam(id: string, alasan: string, penggunaId: string) {
  const teks = alasan.trim();
  if (teks.length < 3) throw new GalatDomain("DATA_TIDAK_VALID", "Alasan blokir wajib diisi (minimal 3 huruf).");
  await prisma.peminjam.update({ where: { id }, data: { status: "DIBLOKIR", alasanBlokir: teks } });
  await catatLog({ jenis: "BLOKIR", penggunaId, peminjamId: id, detail: { alasan: teks } });
}

export async function bukaBlokirPeminjam(id: string, penggunaId: string) {
  await prisma.peminjam.update({ where: { id }, data: { status: "AKTIF", alasanBlokir: null } });
  await catatLog({ jenis: "BUKA_BLOKIR", penggunaId, peminjamId: id });
}

/** Kartu hilang/diganti: kartu baru menggantikan yang lama, riwayat tetap. */
export async function gantiKartu(id: string, kodeKartuBaru: string, penggunaId: string) {
  const kode = normalisasiKodeKartu(kodeKartuBaru);
  if (!kodeKartuValid(kode)) throw new GalatDomain("KARTU_TIDAK_VALID", "Kode kartu tidak valid. Scan ulang kartu baru.");
  const pemilik = await prisma.peminjam.findUnique({ where: { kodeKartu: kode }, select: { id: true } });
  if (pemilik && pemilik.id !== id) {
    throw new GalatDomain("KARTU_SUDAH_TERDAFTAR", "Kartu ini sudah terdaftar atas nama anggota lain.");
  }
  const lama = await prisma.peminjam.findUnique({ where: { id }, select: { kodeKartu: true } });
  if (!lama) throw new GalatDomain("TIDAK_DITEMUKAN", "Data anggota tidak ditemukan.");
  try {
    await prisma.peminjam.update({ where: { id }, data: { kodeKartu: kode } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new GalatDomain("KARTU_SUDAH_TERDAFTAR", "Kartu ini sudah terdaftar atas nama anggota lain.");
    }
    throw err;
  }
  await catatLog({
    jenis: "GANTI_KARTU",
    penggunaId,
    peminjamId: id,
    detail: { kartuLama: lama.kodeKartu, kartuBaru: kode },
  });
}

export type BarisImpor = { nomorInduk: string; nama: string; unit?: string | null; noWa?: string | null };
export type HasilImpor = { dibuat: number; diperbarui: number; dilewati: { baris: number; alasan: string }[] };

const MAKS_BARIS_IMPOR = 5000;

/** Data anggota dari instansi. Kartu & PIN tidak disentuh; ditautkan saat scan pertama. */
export async function imporPeminjam(daftar: BarisImpor[], penggunaId: string): Promise<HasilImpor> {
  if (daftar.length === 0) throw new GalatDomain("DATA_TIDAK_VALID", "File tidak berisi data anggota.");
  if (daftar.length > MAKS_BARIS_IMPOR) {
    throw new GalatDomain("DATA_TIDAK_VALID", `Maksimal ${MAKS_BARIS_IMPOR} baris per impor.`);
  }
  const hasil: HasilImpor = { dibuat: 0, diperbarui: 0, dilewati: [] };
  const valid: { baris: number; nomorInduk: string; nama: string; unit: string | null; noWa: string | null }[] = [];
  const nomorDilihat = new Set<string>();
  daftar.forEach((b, i) => {
    const baris = i + 2;
    const nomor = (b.nomorInduk ?? "").toString().trim();
    const nama = (b.nama ?? "").toString().trim();
    if (!/^[A-Za-z0-9.\-]{3,30}$/.test(nomor)) return hasil.dilewati.push({ baris, alasan: "Nomor ID tidak valid" });
    if (nama.length < 2) return hasil.dilewati.push({ baris, alasan: "Nama kosong" });
    if (nomorDilihat.has(nomor)) return hasil.dilewati.push({ baris, alasan: "Nomor ID ganda di file" });
    nomorDilihat.add(nomor);
    const noWaMentah = b.noWa?.toString().trim();
    const noWa = noWaMentah ? normalisasiNoWa(noWaMentah) : null;
    if (noWaMentah && !noWa) return hasil.dilewati.push({ baris, alasan: "Nomor WhatsApp tidak valid" });
    valid.push({ baris, nomorInduk: nomor, nama: nama.slice(0, 100), unit: b.unit?.toString().trim() || null, noWa });
  });

  const sudahAda = new Set(
    (
      await prisma.peminjam.findMany({
        where: { nomorInduk: { in: valid.map((v) => v.nomorInduk) } },
        select: { nomorInduk: true },
      })
    ).map((p) => p.nomorInduk),
  );

  for (let i = 0; i < valid.length; i += 200) {
    const potongan = valid.slice(i, i + 200);
    await prisma.$transaction(
      potongan.map((v) =>
        prisma.peminjam.upsert({
          where: { nomorInduk: v.nomorInduk },
          create: { nomorInduk: v.nomorInduk, nama: v.nama, unit: v.unit, noWa: v.noWa, sumber: "IMPOR" },
          update: { nama: v.nama, unit: v.unit ?? undefined, noWa: v.noWa ?? undefined },
        }),
      ),
    );
  }
  for (const v of valid) {
    if (sudahAda.has(v.nomorInduk)) hasil.diperbarui++;
    else hasil.dibuat++;
  }
  await catatLog({
    jenis: "IMPOR",
    penggunaId,
    detail: { dibuat: hasil.dibuat, diperbarui: hasil.diperbarui, dilewati: hasil.dilewati.length },
  });
  return hasil;
}
