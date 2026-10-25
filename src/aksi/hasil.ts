import "server-only";
import { unstable_rethrow } from "next/navigation";
import { GalatDomain } from "@/domain/galat";
import { GalatAkses } from "@/lib/sesi";

export type Hasil<T> =
  | { ok: true; data: T }
  | { ok: false; pesan: string; kode?: string; data?: Record<string, unknown> };

/** Galat sesi scan kiosk (token kedaluwarsa / tidak cocok). */
export class GalatSesiScan extends Error {
  constructor() {
    super("Sesi scan sudah berakhir. Silakan scan ulang kartu Anda.");
    this.name = "GalatSesiScan";
  }
}

/** Mengubah galat menjadi hasil yang aman dikirim ke browser. */
export async function bungkus<T>(kerja: () => Promise<T>): Promise<Hasil<T>> {
  try {
    return { ok: true, data: await kerja() };
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof GalatDomain) return { ok: false, pesan: err.message, kode: err.kode, data: err.data };
    if (err instanceof GalatAkses) return { ok: false, pesan: err.message, kode: "AKSES" };
    if (err instanceof GalatSesiScan) return { ok: false, pesan: err.message, kode: "SESI_BERAKHIR" };
    console.error(err);
    return { ok: false, pesan: "Terjadi kesalahan sistem. Silakan coba lagi atau hubungi petugas." };
  }
}
