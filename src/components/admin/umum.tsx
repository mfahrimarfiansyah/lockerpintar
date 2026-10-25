import type { JenisLog } from "@/generated/prisma/enums";
import type { ReactNode } from "react";

export const LABEL_LOG: Record<JenisLog, string> = {
  SCAN: "Scan kartu",
  REGISTRASI: "Registrasi",
  PINJAM: "Pinjam",
  BUKA_ULANG: "Buka ulang",
  KEMBALI: "Kembali",
  PIN_SALAH: "PIN salah",
  PIN_TERKUNCI: "PIN terkunci",
  DITOLAK: "Ditolak",
  PAKSA_BUKA: "Paksa buka",
  PAKSA_SELESAI: "Paksa selesai",
  RESET_PIN: "Reset PIN",
  GANTI_KARTU: "Ganti kartu",
  BLOKIR: "Blokir",
  BUKA_BLOKIR: "Buka blokir",
  IMPOR: "Impor data",
  UBAH_DATA: "Ubah data",
  KUNCI_GAGAL: "Kunci gagal",
};

export function JudulHalaman({ judul, deskripsi, aksi }: { judul: string; deskripsi?: string; aksi?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-2.5">
        <h1 className="anim-semprot huruf-judul teks-grafiti text-[2rem] leading-[0.95] text-balance sm:text-[2.6rem]">
          {judul}
        </h1>
        {deskripsi && <p className="max-w-2xl text-sm text-pretty text-muted-foreground sm:text-base">{deskripsi}</p>}
      </div>
      {aksi}
    </div>
  );
}

export function tautanWa(noWa: string | null, pesan?: string) {
  if (!noWa) return null;
  return `https://wa.me/${noWa}${pesan ? `?text=${encodeURIComponent(pesan)}` : ""}`;
}
