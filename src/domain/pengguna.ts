import { z } from "zod";
import { hashPassword } from "better-auth/crypto";
import { Prisma } from "@/generated/prisma/client";
import type { Peran } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { GalatDomain } from "./galat";
import { catatLog } from "./log";

const skemaPengguna = z
  .object({
    nama: z.string().trim().min(2, "Nama minimal 2 huruf.").max(100),
    email: z.email("Email tidak valid.").transform((v) => v.trim().toLowerCase()),
    password: z.string().min(8, "Password minimal 8 karakter.").max(128),
    peran: z.enum(["ADMIN", "PETUGAS", "KIOSK"]),
    lokasiId: z
      .string()
      .optional()
      .transform((v) => v || null),
  })
  .refine((d) => d.peran !== "KIOSK" || d.lokasiId, {
    message: "Akun kiosk wajib dipasangkan ke satu lokasi.",
  });

export type InputPengguna = z.input<typeof skemaPengguna>;

/** Membuat akun staf/kiosk dengan password yang kompatibel dengan Better Auth. */
export async function buatPengguna(input: InputPengguna, olehId: string | null) {
  const hasil = skemaPengguna.safeParse(input);
  if (!hasil.success) throw new GalatDomain("DATA_TIDAK_VALID", hasil.error.issues[0]!.message);
  const { password, ...data } = hasil.data;
  const hash = await hashPassword(password);
  try {
    const pengguna = await prisma.$transaction(async (tx) => {
      const p = await tx.pengguna.create({ data: { ...data, emailVerified: true } });
      await tx.akun.create({ data: { userId: p.id, accountId: p.id, providerId: "credential", password: hash } });
      return p;
    });
    await catatLog({
      jenis: "UBAH_DATA",
      penggunaId: olehId,
      lokasiId: pengguna.lokasiId,
      detail: { objek: "pengguna", aksi: "buat", email: pengguna.email, peran: pengguna.peran },
    });
    return pengguna;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new GalatDomain("DATA_TIDAK_VALID", "Email sudah dipakai akun lain.");
    }
    throw err;
  }
}

export async function aturAktifPengguna(id: string, aktif: boolean, olehId: string) {
  if (id === olehId && !aktif) throw new GalatDomain("DATA_TIDAK_VALID", "Anda tidak bisa menonaktifkan akun sendiri.");
  await prisma.$transaction([
    prisma.pengguna.update({ where: { id }, data: { aktif } }),
    ...(aktif ? [] : [prisma.sesi.deleteMany({ where: { userId: id } })]),
  ]);
  await catatLog({ jenis: "UBAH_DATA", penggunaId: olehId, detail: { objek: "pengguna", aksi: aktif ? "aktifkan" : "nonaktifkan", id } });
}

export async function gantiPasswordPengguna(id: string, passwordBaru: string, olehId: string) {
  if (passwordBaru.length < 8) throw new GalatDomain("DATA_TIDAK_VALID", "Password minimal 8 karakter.");
  const hash = await hashPassword(passwordBaru);
  const { count } = await prisma.akun.updateMany({
    where: { userId: id, providerId: "credential" },
    data: { password: hash },
  });
  if (count === 0) throw new GalatDomain("TIDAK_DITEMUKAN", "Akun tidak ditemukan.");
  await prisma.sesi.deleteMany({ where: { userId: id } });
  await catatLog({ jenis: "UBAH_DATA", penggunaId: olehId, detail: { objek: "pengguna", aksi: "ganti-password", id } });
}

export const LABEL_PERAN: Record<Peran, string> = {
  ADMIN: "Admin",
  PETUGAS: "Petugas",
  KIOSK: "Kiosk",
};
