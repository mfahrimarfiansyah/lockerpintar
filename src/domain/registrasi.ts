import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { hashPin } from "@/lib/hash-pin";
import { kodeKartuValid, normalisasiKodeKartu, normalisasiNoWa } from "@/lib/kartu";
import { GalatDomain } from "./galat";
import { catatLog } from "./log";

const skemaRegistrasi = z.object({
  kodeKartu: z.string(),
  nomorInduk: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9.\-]{3,30}$/, "Nomor ID hanya boleh huruf, angka, titik, atau strip (3–30 karakter)."),
  nama: z.string().trim().min(2, "Nama minimal 2 huruf.").max(100, "Nama terlalu panjang."),
  unit: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => v || null),
  noWa: z.string().trim().min(1, "Nomor WhatsApp wajib diisi."),
  pin: z.string().regex(/^\d{4,6}$/, "PIN harus 4–6 angka."),
  setuju: z.literal(true, { message: "Centang persetujuan penggunaan data terlebih dulu." }),
});

export type InputRegistrasi = z.input<typeof skemaRegistrasi>;

/**
 * Mendaftarkan kartu baru. Bila nomor ID sudah ada dari impor admin (belum punya kartu),
 * kartu ditautkan ke data tersebut.
 */
export async function daftarkanPeminjam(
  input: InputRegistrasi & { sumber: "KIOSK" | "PETUGAS"; penggunaId: string | null; lokasiId: string | null },
  sekarang = new Date(),
): Promise<{ peminjamId: string; tautImpor: boolean }> {
  const hasil = skemaRegistrasi.safeParse(input);
  if (!hasil.success) {
    throw new GalatDomain("DATA_TIDAK_VALID", hasil.error.issues[0]?.message ?? "Data tidak valid.");
  }
  const data = hasil.data;
  const kode = normalisasiKodeKartu(data.kodeKartu);
  if (!kodeKartuValid(kode)) throw new GalatDomain("KARTU_TIDAK_VALID", "Kartu tidak terbaca. Silakan scan ulang.");
  const noWa = normalisasiNoWa(data.noWa);
  if (!noWa) throw new GalatDomain("DATA_TIDAK_VALID", "Nomor WhatsApp tidak valid. Contoh: 081234567890.");
  const pinHash = await hashPin(data.pin);

  try {
    return await prisma.$transaction(async (tx) => {
      const pemilikKartu = await tx.peminjam.findUnique({ where: { kodeKartu: kode }, select: { id: true } });
      if (pemilikKartu) throw new GalatDomain("KARTU_SUDAH_TERDAFTAR", "Kartu ini sudah terdaftar.");

      const ada = await tx.peminjam.findUnique({ where: { nomorInduk: data.nomorInduk } });
      if (ada?.kodeKartu) {
        throw new GalatDomain(
          "NOMOR_TERHUBUNG_KARTU_LAIN",
          "Nomor ID ini sudah terhubung ke kartu lain. Bila kartu Anda baru, minta petugas mengganti kartu.",
        );
      }
      if (ada?.status === "DIBLOKIR") {
        throw new GalatDomain("DIBLOKIR", "Akun dengan nomor ID ini diblokir. Silakan hubungi petugas.");
      }

      const peminjam = ada
        ? await tx.peminjam.update({
            where: { id: ada.id },
            data: {
              kodeKartu: kode,
              nama: data.nama,
              unit: data.unit ?? ada.unit,
              noWa,
              pinHash,
              pinSalah: 0,
              pinTerkunciSampai: null,
              setujuDataAt: sekarang,
            },
          })
        : await tx.peminjam.create({
            data: {
              nomorInduk: data.nomorInduk,
              nama: data.nama,
              unit: data.unit,
              noWa,
              kodeKartu: kode,
              pinHash,
              sumber: input.sumber,
              setujuDataAt: sekarang,
            },
          });

      await catatLog(
        {
          jenis: "REGISTRASI",
          penggunaId: input.penggunaId,
          peminjamId: peminjam.id,
          lokasiId: input.lokasiId,
          detail: { tautImpor: Boolean(ada), sumber: input.sumber },
        },
        tx,
      );
      return { peminjamId: peminjam.id, tautImpor: Boolean(ada) };
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new GalatDomain("KARTU_SUDAH_TERDAFTAR", "Kartu atau nomor ID ini baru saja didaftarkan. Silakan scan ulang.");
    }
    throw err;
  }
}
