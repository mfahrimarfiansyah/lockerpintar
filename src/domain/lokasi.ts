import { z } from "zod";
import type { KondisiLoker, ModeKunci } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { jamValid } from "@/lib/waktu";
import { GalatDomain } from "./galat";
import { catatLog } from "./log";

export async function ambilLokasiAktif(lokasiId: string) {
  const lokasi = await prisma.lokasi.findUnique({ where: { id: lokasiId } });
  if (!lokasi) throw new GalatDomain("TIDAK_DITEMUKAN", "Lokasi tidak ditemukan.");
  if (!lokasi.aktif) throw new GalatDomain("LOKASI_NONAKTIF", `${lokasi.nama} sedang tidak aktif.`);
  return lokasi;
}

function pesanPertama(err: z.ZodError) {
  return err.issues[0]?.message ?? "Data tidak valid.";
}

const skemaLokasi = z
  .object({
    nama: z.string().trim().min(2, "Nama lokasi minimal 2 huruf.").max(100),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug hanya huruf kecil, angka, dan tanda strip (mis. gedung-a)."),
    alamat: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((v) => v || null),
    zonaWaktu: z.enum(["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"], { message: "Zona waktu tidak dikenal." }),
    jamBuka: z.string().refine(jamValid, "Jam buka harus berformat HH:mm."),
    jamTutup: z.string().refine(jamValid, "Jam tutup harus berformat HH:mm."),
    modeKunci: z.enum(["SIMULASI", "MANUAL"]),
    wajibPin: z.boolean(),
    aktif: z.boolean(),
  })
  .refine((d) => d.jamTutup > d.jamBuka, { message: "Jam tutup harus setelah jam buka (lokasi 24 jam belum didukung)." });

export type InputLokasi = z.input<typeof skemaLokasi>;

export async function simpanLokasi(id: string | null, input: InputLokasi, penggunaId: string) {
  const hasil = skemaLokasi.safeParse(input);
  if (!hasil.success) throw new GalatDomain("DATA_TIDAK_VALID", pesanPertama(hasil.error));
  try {
    const lokasi = id
      ? await prisma.lokasi.update({ where: { id }, data: hasil.data })
      : await prisma.lokasi.create({ data: hasil.data });
    await catatLog({
      jenis: "UBAH_DATA",
      penggunaId,
      lokasiId: lokasi.id,
      detail: { objek: "lokasi", aksi: id ? "ubah" : "buat", nama: lokasi.nama },
    });
    return lokasi;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new GalatDomain("DATA_TIDAK_VALID", "Slug sudah dipakai lokasi lain.");
    }
    throw err;
  }
}

const skemaLokerMassal = z.object({
  blok: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{1,4}$/, "Blok berupa 1–4 huruf/angka, mis. A."),
  baris: z.coerce.number().int().min(1, "Baris minimal 1.").max(20),
  kolom: z.coerce.number().int().min(1, "Kolom minimal 1.").max(20),
  ukuran: z
    .string()
    .trim()
    .max(10)
    .optional()
    .transform((v) => v || null),
});

/** Menambah loker satu blok sekaligus: blok A, 2 baris x 5 kolom -> A-01..A-10. */
export async function buatLokerMassal(lokasiId: string, input: z.input<typeof skemaLokerMassal>, penggunaId: string) {
  const hasil = skemaLokerMassal.safeParse(input);
  if (!hasil.success) throw new GalatDomain("DATA_TIDAK_VALID", pesanPertama(hasil.error));
  const { blok, baris, kolom, ukuran } = hasil.data;
  const lokasi = await prisma.lokasi.findUnique({ where: { id: lokasiId }, select: { id: true } });
  if (!lokasi) throw new GalatDomain("TIDAK_DITEMUKAN", "Lokasi tidak ditemukan.");
  const sudahAda = await prisma.loker.findMany({ where: { lokasiId, blok }, select: { kode: true, baris: true } });
  const nomorTerakhir = sudahAda.reduce((maks, l) => Math.max(maks, Number(l.kode.split("-").pop()) || 0), 0);
  const barisAwal = sudahAda.reduce((maks, l) => Math.max(maks, l.baris), 0);
  const data: Prisma.LokerCreateManyInput[] = [];
  let nomor = nomorTerakhir;
  for (let b = 1; b <= baris; b++) {
    for (let k = 1; k <= kolom; k++) {
      nomor++;
      data.push({
        lokasiId,
        blok,
        baris: barisAwal + b,
        kolom: k,
        ukuran,
        kode: `${blok}-${String(nomor).padStart(2, "0")}`,
      });
    }
  }
  await prisma.loker.createMany({ data, skipDuplicates: true });
  await catatLog({
    jenis: "UBAH_DATA",
    penggunaId,
    lokasiId,
    detail: { objek: "loker", aksi: "buat-massal", blok, jumlah: data.length },
  });
  return data.length;
}

export async function ubahKondisiLoker(lokerId: string, kondisi: KondisiLoker, penggunaId: string) {
  const loker = await prisma.loker.update({ where: { id: lokerId }, data: { kondisi } });
  await catatLog({
    jenis: "UBAH_DATA",
    penggunaId,
    lokerId,
    lokasiId: loker.lokasiId,
    detail: { objek: "loker", aksi: "kondisi", kode: loker.kode, kondisi },
  });
  return loker;
}

export const LABEL_MODE_KUNCI: Record<ModeKunci, string> = {
  SIMULASI: "Simulasi (tanpa hardware)",
  MANUAL: "Manual (kunci biasa)",
};
