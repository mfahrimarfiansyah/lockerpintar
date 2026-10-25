import {
  daftarLokasiDenganRingkasan,
  hitungJumlah,
  statusLokerLokasi,
  statusUntukPublik,
  type JumlahStatus,
  type LokerDenganStatus,
  type RingkasanLokasi,
} from "@/domain/ketersediaan";
import { prisma } from "@/lib/db";
import { dalamJamBuka } from "@/lib/waktu";

export type LokasiPublik = Omit<RingkasanLokasi, "id">;

export type StatusLokasi = {
  lokasi: {
    id: string;
    nama: string;
    slug: string;
    alamat: string | null;
    jamBuka: string;
    jamTutup: string;
    zonaWaktu: string;
    sedangBuka: boolean;
  };
  loker: LokerDenganStatus[];
  jumlah: JumlahStatus;
  diperbarui: string;
};

function jumlahPublik(j: JumlahStatus): JumlahStatus {
  return { ...j, dipakai: j.dipakai + j.terlambat, terlambat: 0 };
}

/** Ringkasan semua lokasi tanpa membedakan terlambat (untuk publik). */
export async function ringkasanPublik(sekarang = new Date()): Promise<LokasiPublik[]> {
  const daftar = await daftarLokasiDenganRingkasan(sekarang);
  return daftar.map((l) => ({
    nama: l.nama,
    slug: l.slug,
    alamat: l.alamat,
    jamBuka: l.jamBuka,
    jamTutup: l.jamTutup,
    zonaWaktu: l.zonaWaktu,
    sedangBuka: l.sedangBuka,
    jumlah: jumlahPublik(l.jumlah),
  }));
}

/**
 * Status loker satu lokasi. `publik` menyamarkan TERLAMBAT menjadi DIPAKAI
 * (halaman publik & layar kiosk tidak menunjukkan siapa yang terlambat).
 */
export async function statusLokasi(
  cari: { slug: string } | { id: string },
  opsi: { publik: boolean },
  sekarang = new Date(),
): Promise<StatusLokasi | null> {
  const lokasi = await prisma.lokasi.findUnique({ where: "slug" in cari ? { slug: cari.slug } : { id: cari.id } });
  if (!lokasi || !lokasi.aktif) return null;
  const loker = (await statusLokerLokasi(lokasi.id, sekarang)).map((l) =>
    opsi.publik ? { ...l, status: statusUntukPublik(l.status) } : l,
  );
  return {
    lokasi: {
      id: lokasi.id,
      nama: lokasi.nama,
      slug: lokasi.slug,
      alamat: lokasi.alamat,
      jamBuka: lokasi.jamBuka,
      jamTutup: lokasi.jamTutup,
      zonaWaktu: lokasi.zonaWaktu,
      sedangBuka: dalamJamBuka(sekarang, lokasi.zonaWaktu, lokasi.jamBuka, lokasi.jamTutup),
    },
    loker,
    jumlah: hitungJumlah(loker),
    diperbarui: sekarang.toISOString(),
  };
}
