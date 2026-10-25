import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { daftarLokasiDenganRingkasan, statusLokerLokasi } from "@/domain/ketersediaan";
import { prisma } from "@/lib/db";
import { awalHariIni, waktuLokalKeUtc } from "@/lib/waktu";

/** Zona waktu acuan untuk filter tanggal di laporan. */
export const ZONA_LAPORAN = "Asia/Makassar";
export const PER_HALAMAN = 25;

export async function ringkasanDashboard(sekarang: Date, lokasiIdTerbatas: string | null) {
  const lokasi = (await daftarLokasiDenganRingkasan(sekarang)).filter(
    (l) => !lokasiIdTerbatas || l.id === lokasiIdTerbatas,
  );
  const total = { kosong: 0, dipakai: 0, terlambat: 0, perbaikan: 0 };
  for (const l of lokasi) {
    total.kosong += l.jumlah.kosong;
    total.dipakai += l.jumlah.dipakai;
    total.terlambat += l.jumlah.terlambat;
    total.perbaikan += l.jumlah.perbaikan;
  }
  const [pinjamHariIni, grid] = await Promise.all([
    Promise.all(
      lokasi.map((l) =>
        prisma.peminjaman.count({
          where: { mulaiAt: { gte: awalHariIni(sekarang, l.zonaWaktu) }, loker: { lokasiId: l.id } },
        }),
      ),
    ).then((daftar) => daftar.reduce((a, b) => a + b, 0)),
    Promise.all(lokasi.map(async (l) => ({ ...l, loker: await statusLokerLokasi(l.id, sekarang) }))),
  ]);
  return { total, pinjamHariIni, lokasi: grid };
}

export async function peminjamanAktif(sekarang: Date, lokasiIdTerbatas: string | null) {
  const daftar = await prisma.peminjaman.findMany({
    where: { selesaiAt: null, ...(lokasiIdTerbatas ? { loker: { lokasiId: lokasiIdTerbatas } } : {}) },
    include: { peminjam: true, loker: { include: { lokasi: true } } },
    orderBy: { batasAt: "asc" },
    take: 200,
  });
  return daftar.map((p) => ({
    id: p.id,
    peminjamId: p.peminjamId,
    nama: p.peminjam.nama,
    nomor: p.peminjam.nomorInduk,
    noWa: p.peminjam.noWa,
    lokerKode: p.loker.kode,
    lokasiNama: p.loker.lokasi.nama,
    zonaWaktu: p.loker.lokasi.zonaWaktu,
    mulaiAt: p.mulaiAt,
    batasAt: p.batasAt,
    terlambat: p.batasAt < sekarang,
  }));
}

export async function statusPerangkatKiosk(sekarang: Date) {
  const kiosk = await prisma.pengguna.findMany({
    where: { peran: "KIOSK" },
    include: { lokasi: { select: { nama: true } } },
    orderBy: { nama: "asc" },
  });
  return kiosk.map((k) => ({
    id: k.id,
    nama: k.nama,
    lokasiNama: k.lokasi?.nama ?? "Belum dipasangkan",
    aktif: k.aktif,
    terakhirAktifAt: k.terakhirAktifAt,
    online: Boolean(k.terakhirAktifAt && sekarang.getTime() - k.terakhirAktifAt.getTime() < 30_000),
  }));
}

export async function aktivitasTerbaru(batas: number, lokasiIdTerbatas: string | null, peminjamId?: string) {
  const log = await prisma.logAktivitas.findMany({
    where: {
      ...(lokasiIdTerbatas ? { lokasiId: lokasiIdTerbatas } : {}),
      ...(peminjamId ? { peminjamId } : {}),
    },
    orderBy: { waktu: "desc" },
    take: batas,
    include: { pengguna: { select: { nama: true } } },
  });
  const idPeminjam = [...new Set(log.map((l) => l.peminjamId).filter((x): x is string => Boolean(x)))];
  const peminjam = new Map(
    (await prisma.peminjam.findMany({ where: { id: { in: idPeminjam } }, select: { id: true, nama: true } })).map(
      (p) => [p.id, p.nama],
    ),
  );
  return log.map((l) => {
    const detail = (l.detail ?? {}) as Record<string, unknown>;
    return {
      id: l.id,
      waktu: l.waktu,
      jenis: l.jenis,
      oleh: l.pengguna?.nama ?? null,
      peminjam: l.peminjamId ? (peminjam.get(l.peminjamId) ?? null) : null,
      lokerKode: typeof detail.lokerKode === "string" ? detail.lokerKode : null,
      objek: typeof detail.objek === "string" ? detail.objek : null,
      alasan: typeof detail.alasan === "string" ? detail.alasan : null,
    };
  });
}

export type FilterRiwayat = {
  lokasiId?: string;
  status?: string;
  dari?: string;
  sampai?: string;
  q?: string;
};

function tanggalKeUtc(teks: string | undefined, akhirHari: boolean): Date | undefined {
  const cocok = teks ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(teks) : null;
  if (!cocok) return undefined;
  const awal = waktuLokalKeUtc(Number(cocok[1]), Number(cocok[2]), Number(cocok[3]), 0, 0, ZONA_LAPORAN);
  return akhirHari ? new Date(awal.getTime() + 24 * 3600_000) : awal;
}

export function kondisiRiwayat(
  f: FilterRiwayat,
  sekarang: Date,
  lokasiIdTerbatas: string | null,
): Prisma.PeminjamanWhereInput {
  const dan: Prisma.PeminjamanWhereInput[] = [];
  const lokasiId = lokasiIdTerbatas ?? f.lokasiId;
  if (lokasiId) dan.push({ loker: { lokasiId } });
  if (f.status === "aktif") dan.push({ selesaiAt: null, batasAt: { gte: sekarang } });
  else if (f.status === "terlambat") dan.push({ selesaiAt: null, batasAt: { lt: sekarang } });
  else if (f.status === "selesai") dan.push({ selesaiAt: { not: null } });
  else if (f.status === "paksa") dan.push({ caraSelesai: "PAKSA" });
  const dari = tanggalKeUtc(f.dari, false);
  const sampai = tanggalKeUtc(f.sampai, true);
  if (dari || sampai) dan.push({ mulaiAt: { ...(dari ? { gte: dari } : {}), ...(sampai ? { lt: sampai } : {}) } });
  const q = f.q?.trim();
  if (q) {
    dan.push({
      OR: [
        { peminjam: { nama: { contains: q, mode: "insensitive" } } },
        { peminjam: { nomorInduk: { contains: q } } },
        { loker: { kode: { equals: q.toUpperCase() } } },
      ],
    });
  }
  return { AND: dan };
}

export async function riwayatPeminjaman(
  f: FilterRiwayat,
  halaman: number,
  sekarang: Date,
  lokasiIdTerbatas: string | null,
) {
  const where = kondisiRiwayat(f, sekarang, lokasiIdTerbatas);
  const [total, daftar] = await Promise.all([
    prisma.peminjaman.count({ where }),
    prisma.peminjaman.findMany({
      where,
      include: { peminjam: true, loker: { include: { lokasi: true } } },
      orderBy: { mulaiAt: "desc" },
      skip: (halaman - 1) * PER_HALAMAN,
      take: PER_HALAMAN,
    }),
  ]);
  return { total, daftar };
}

export async function daftarAnggota(q: string | undefined, status: string | undefined, halaman: number) {
  const dan: Prisma.PeminjamWhereInput[] = [];
  const kata = q?.trim();
  if (kata) {
    dan.push({
      OR: [{ nama: { contains: kata, mode: "insensitive" } }, { nomorInduk: { contains: kata } }],
    });
  }
  if (status === "diblokir") dan.push({ status: "DIBLOKIR" });
  if (status === "belum-kartu") dan.push({ kodeKartu: null });
  const where = { AND: dan };
  const [total, daftar] = await Promise.all([
    prisma.peminjam.count({ where }),
    prisma.peminjam.findMany({
      where,
      orderBy: { nama: "asc" },
      skip: (halaman - 1) * PER_HALAMAN,
      take: PER_HALAMAN,
      include: { _count: { select: { peminjaman: { where: { selesaiAt: null } } } } },
    }),
  ]);
  return { total, daftar };
}

export async function detailAnggota(id: string) {
  return prisma.peminjam.findUnique({
    where: { id },
    include: {
      peminjaman: {
        orderBy: { mulaiAt: "desc" },
        take: 50,
        include: { loker: { include: { lokasi: true } } },
      },
    },
  });
}

export async function daftarLokasiAdmin() {
  const lokasi = await prisma.lokasi.findMany({
    orderBy: { nama: "asc" },
    include: { _count: { select: { loker: true, pengguna: true } } },
  });
  return lokasi;
}

export async function detailLokasiAdmin(id: string, sekarang: Date) {
  const lokasi = await prisma.lokasi.findUnique({ where: { id } });
  if (!lokasi) return null;
  const [status, loker] = await Promise.all([
    statusLokerLokasi(id, sekarang),
    prisma.loker.findMany({ where: { lokasiId: id }, orderBy: [{ blok: "asc" }, { baris: "asc" }, { kolom: "asc" }] }),
  ]);
  return { lokasi, status, loker };
}

export async function daftarPengguna() {
  return prisma.pengguna.findMany({
    orderBy: [{ peran: "asc" }, { nama: "asc" }],
    include: { lokasi: { select: { nama: true } } },
  });
}

export async function pilihanLokasi(lokasiIdTerbatas: string | null) {
  return prisma.lokasi.findMany({
    where: { aktif: true, ...(lokasiIdTerbatas ? { id: lokasiIdTerbatas } : {}) },
    orderBy: { nama: "asc" },
    select: { id: true, nama: true, zonaWaktu: true },
  });
}
