import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Peran } from "@/generated/prisma/enums";
import { auth } from "./auth";

export type PenggunaSesi = {
  id: string;
  nama: string;
  email: string;
  peran: Peran;
  lokasiId: string | null;
};

export async function ambilPengguna(): Promise<PenggunaSesi | null> {
  const sesi = await auth.api.getSession({ headers: await headers() });
  if (!sesi || !sesi.user.aktif) return null;
  const u = sesi.user;
  return { id: u.id, nama: u.name, email: u.email, peran: u.peran as Peran, lokasiId: u.lokasiId ?? null };
}

export function berandaUntuk(peran: Peran) {
  return peran === "KIOSK" ? "/kiosk" : "/admin";
}

/** Untuk halaman: alihkan ke /masuk atau beranda peran bila tidak berhak. */
export async function wajibPeran(...peran: Peran[]): Promise<PenggunaSesi> {
  const pengguna = await ambilPengguna();
  if (!pengguna) redirect("/masuk");
  if (!peran.includes(pengguna.peran)) redirect(berandaUntuk(pengguna.peran));
  return pengguna;
}

export class GalatAkses extends Error {
  constructor(pesan = "Sesi berakhir atau Anda tidak berhak melakukan ini. Silakan masuk lagi.") {
    super(pesan);
    this.name = "GalatAkses";
  }
}

/** Untuk Server Action & Route Handler: lempar galat, jangan redirect. */
export async function penggunaUntukAksi(...peran: Peran[]): Promise<PenggunaSesi> {
  const pengguna = await ambilPengguna();
  if (!pengguna || !peran.includes(pengguna.peran)) throw new GalatAkses();
  return pengguna;
}
