import type { StatusLoker } from "@/domain/ketersediaan";

export const LABEL_STATUS: Record<StatusLoker, string> = {
  KOSONG: "Kosong",
  DIPAKAI: "Dipakai",
  TERLAMBAT: "Terlambat",
  PERBAIKAN: "Perbaikan",
};

/** Pintu loker di bank besi: kosong = semprotan limau, dipakai = baja, terlambat = magenta, perbaikan = pita hazard. */
export const KELAS_STATUS: Record<StatusLoker, string> = {
  KOSONG: "border-tinta bg-limau text-tinta shadow-[0_0_22px_-6px_var(--limau)]",
  DIPAKAI: "border-white/10 bg-[#2a2928] text-[#a19d95]",
  TERLAMBAT: "border-tinta bg-magenta text-tinta shadow-[0_0_22px_-6px_var(--magenta)]",
  PERBAIKAN: "hazard border-tinta text-tinta",
};

export const KELAS_TITIK: Record<StatusLoker, string> = {
  KOSONG: "border-tinta bg-limau",
  DIPAKAI: "border-white/30 bg-[#2a2928]",
  TERLAMBAT: "border-tinta bg-magenta",
  PERBAIKAN: "border-tinta bg-[repeating-linear-gradient(-45deg,var(--kuning)_0_3px,var(--tinta)_3px_6px)]",
};
