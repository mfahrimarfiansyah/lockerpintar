import type { KondisiLoker } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { dalamJamBuka } from "@/lib/waktu";

export type StatusLoker = "KOSONG" | "DIPAKAI" | "TERLAMBAT" | "PERBAIKAN";

export type LokerDenganStatus = {
  id: string;
  kode: string;
  blok: string;
  baris: number;
  kolom: number;
  ukuran: string | null;
  status: StatusLoker;
};

export type JumlahStatus = {
  kosong: number;
  dipakai: number;
  terlambat: number;
  perbaikan: number;
  total: number;
};

function hitungStatus(kondisi: KondisiLoker, aktif: { batasAt: Date } | undefined, sekarang: Date): StatusLoker {
  if (aktif) return aktif.batasAt < sekarang ? "TERLAMBAT" : "DIPAKAI";
  if (kondisi === "PERBAIKAN") return "PERBAIKAN";
  return "KOSONG";
}

/** Halaman publik & layar kiosk tidak membedakan terlambat dari dipakai. */
export function statusUntukPublik(status: StatusLoker): StatusLoker {
  return status === "TERLAMBAT" ? "DIPAKAI" : status;
}

export function hitungJumlah(daftar: { status: StatusLoker }[]): JumlahStatus {
  const jumlah: JumlahStatus = { kosong: 0, dipakai: 0, terlambat: 0, perbaikan: 0, total: daftar.length };
  for (const l of daftar) {
    if (l.status === "KOSONG") jumlah.kosong++;
    else if (l.status === "DIPAKAI") jumlah.dipakai++;
    else if (l.status === "TERLAMBAT") jumlah.terlambat++;
    else jumlah.perbaikan++;
  }
  return jumlah;
}

const pilihLoker = {
  id: true,
  kode: true,
  blok: true,
  baris: true,
  kolom: true,
  ukuran: true,
  kondisi: true,
  peminjaman: { where: { selesaiAt: null }, select: { batasAt: true }, take: 1 },
} as const;

export async function statusLokerLokasi(lokasiId: string, sekarang = new Date()): Promise<LokerDenganStatus[]> {
  const daftar = await prisma.loker.findMany({
    where: { lokasiId, kondisi: { not: "NONAKTIF" } },
    orderBy: [{ blok: "asc" }, { baris: "asc" }, { kolom: "asc" }],
    select: pilihLoker,
  });
  return daftar.map((l) => ({
    id: l.id,
    kode: l.kode,
    blok: l.blok,
    baris: l.baris,
    kolom: l.kolom,
    ukuran: l.ukuran,
    status: hitungStatus(l.kondisi, l.peminjaman[0], sekarang),
  }));
}

export type RingkasanLokasi = {
  id: string;
  nama: string;
  slug: string;
  alamat: string | null;
  jamBuka: string;
  jamTutup: string;
  zonaWaktu: string;
  sedangBuka: boolean;
  jumlah: JumlahStatus;
};

export async function daftarLokasiDenganRingkasan(sekarang = new Date()): Promise<RingkasanLokasi[]> {
  const daftar = await prisma.lokasi.findMany({
    where: { aktif: true },
    orderBy: { nama: "asc" },
    select: {
      id: true,
      nama: true,
      slug: true,
      alamat: true,
      jamBuka: true,
      jamTutup: true,
      zonaWaktu: true,
      loker: { where: { kondisi: { not: "NONAKTIF" } }, select: pilihLoker },
    },
  });
  return daftar.map((l) => ({
    id: l.id,
    nama: l.nama,
    slug: l.slug,
    alamat: l.alamat,
    jamBuka: l.jamBuka,
    jamTutup: l.jamTutup,
    zonaWaktu: l.zonaWaktu,
    sedangBuka: dalamJamBuka(sekarang, l.zonaWaktu, l.jamBuka, l.jamTutup),
    jumlah: hitungJumlah(l.loker.map((x) => ({ status: hitungStatus(x.kondisi, x.peminjaman[0], sekarang) }))),
  }));
}
