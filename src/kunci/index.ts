import type { ModeKunci } from "@/generated/prisma/enums";

export type RefLoker = { id: string; kode: string; lokasiId: string };
export type HasilBuka = { ok: true } | { ok: false; alasan: string };
export type StatusPintu = "TERBUKA" | "TERTUTUP" | "TIDAK_DIKETAHUI";

/** Satu antarmuka untuk semua jenis kunci; alur aplikasi tidak tahu hardware-nya. */
export interface DriverKunci {
  readonly mode: ModeKunci;
  buka(loker: RefLoker): Promise<HasilBuka>;
  status(loker: RefLoker): Promise<StatusPintu>;
  /** Kalimat untuk layar kiosk setelah pintu berhasil dibuka. */
  pesanBuka(kodeLoker: string): string;
}

// ---- Simulasi: status pintu disimpan di memori proses ----

const LAMA_PINTU_TERBUKA_MS = 8_000;

type StoreSimulasi = {
  pintu: Map<string, number>;
  gagalBerikutnya: Set<string>;
};

const globalSimulasi = globalThis as unknown as { simulasiKunciLockerPintar?: StoreSimulasi };
const store: StoreSimulasi = (globalSimulasi.simulasiKunciLockerPintar ??= {
  pintu: new Map(),
  gagalBerikutnya: new Set(),
});

export const driverSimulasi: DriverKunci = {
  mode: "SIMULASI",
  async buka(loker) {
    if (store.gagalBerikutnya.delete(loker.lokasiId)) {
      return { ok: false, alasan: "Simulasi: kunci tidak merespons" };
    }
    store.pintu.set(loker.id, Date.now());
    return { ok: true };
  },
  async status(loker) {
    const sejak = store.pintu.get(loker.id);
    return sejak !== undefined && Date.now() - sejak < LAMA_PINTU_TERBUKA_MS ? "TERBUKA" : "TERTUTUP";
  },
  pesanBuka: (kode) => `Loker ${kode} terbuka`,
};

/** Untuk halaman Simulator Kunci: buat pembukaan berikutnya di lokasi ini gagal. */
export function aturGagalBerikutnya(lokasiId: string, aktif: boolean) {
  if (aktif) store.gagalBerikutnya.add(lokasiId);
  else store.gagalBerikutnya.delete(lokasiId);
}

export function gagalBerikutnyaAktif(lokasiId: string) {
  return store.gagalBerikutnya.has(lokasiId);
}

// ---- Manual: loker berkunci biasa, sistem hanya mencatat ----

export const driverManual: DriverKunci = {
  mode: "MANUAL",
  async buka() {
    return { ok: true };
  },
  async status() {
    return "TIDAK_DIKETAHUI";
  },
  pesanBuka: (kode) => `Silakan buka loker ${kode}`,
};

export function driverUntuk(mode: ModeKunci): DriverKunci {
  switch (mode) {
    case "SIMULASI":
      return driverSimulasi;
    case "MANUAL":
      return driverManual;
  }
}
