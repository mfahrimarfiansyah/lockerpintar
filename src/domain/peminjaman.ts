import { z } from "zod";
import { prisma } from "@/lib/db";
import { batasHariIni, dalamJamBuka } from "@/lib/waktu";
import { driverUntuk } from "@/kunci";
import { GalatDomain } from "./galat";
import { ambilLokasiAktif } from "./lokasi";
import { catatLog } from "./log";
import { ambilPengaturan } from "./pengaturan";

export type HasilPinjam = {
  peminjamanId: string;
  lokerId: string;
  lokerKode: string;
  batasAt: string;
  zonaWaktu: string;
  pesanBuka: string;
};

/** Loker yang dipilih otomatis baru saja diambil orang lain; transaksi diulang. */
class CobaLagi extends Error {}

function teksJam(jam: string) {
  return jam.replace(":", ".");
}

export async function pinjamLoker(
  input: { peminjamId: string; lokasiId: string; lokerId: string | null; penggunaId: string | null },
  sekarang = new Date(),
): Promise<HasilPinjam> {
  const [lokasi, pengaturan] = await Promise.all([ambilLokasiAktif(input.lokasiId), ambilPengaturan()]);
  if (!dalamJamBuka(sekarang, lokasi.zonaWaktu, lokasi.jamBuka, lokasi.jamTutup)) {
    throw new GalatDomain(
      "DI_LUAR_JAM_BUKA",
      `${lokasi.nama} melayani peminjaman pukul ${teksJam(lokasi.jamBuka)}–${teksJam(lokasi.jamTutup)}.`,
    );
  }
  const batasAt = batasHariIni(sekarang, lokasi.zonaWaktu, lokasi.jamTutup);

  const jalankan = () =>
    prisma.$transaction(async (tx) => {
      // Urutan kunci selalu: baris peminjam, lalu baris loker (mencegah deadlock).
      const [peminjam] = await tx.$queryRaw<{ id: string; status: string; pinHash: string | null }[]>`
        SELECT id, status::text AS status, "pinHash" FROM "Peminjam" WHERE id = ${input.peminjamId} FOR UPDATE`;
      if (!peminjam) throw new GalatDomain("TIDAK_DITEMUKAN", "Data anggota tidak ditemukan.");
      if (peminjam.status === "DIBLOKIR") {
        throw new GalatDomain("DIBLOKIR", "Akun Anda diblokir. Silakan hubungi petugas.");
      }
      if (lokasi.wajibPin && !peminjam.pinHash) throw new GalatDomain("PERLU_BUAT_PIN", "Buat PIN terlebih dulu.");

      const aktif = await tx.peminjaman.findMany({
        where: { peminjamId: peminjam.id, selesaiAt: null },
        select: { batasAt: true },
      });
      if (aktif.some((a) => a.batasAt < sekarang)) {
        throw new GalatDomain("BATAS_PINJAM", "Kembalikan dulu loker yang sudah lewat batas waktu.");
      }
      if (aktif.length >= pengaturan.maksPinjamPerOrang) {
        throw new GalatDomain(
          "BATAS_PINJAM",
          `Anda sedang meminjam ${aktif.length} loker (maksimal ${pengaturan.maksPinjamPerOrang}).`,
        );
      }

      let loker: { id: string; kode: string } | undefined;
      if (input.lokerId) {
        const [l] = await tx.$queryRaw<{ id: string; kode: string; lokasiId: string; kondisi: string }[]>`
          SELECT id, kode, "lokasiId", kondisi::text AS kondisi FROM "Loker" WHERE id = ${input.lokerId} FOR UPDATE`;
        if (!l || l.lokasiId !== lokasi.id || l.kondisi !== "NORMAL") {
          throw new GalatDomain("LOKER_TIDAK_TERSEDIA", "Loker ini tidak bisa dipinjam. Silakan pilih loker lain.");
        }
        loker = l;
      } else {
        [loker] = await tx.$queryRaw<{ id: string; kode: string }[]>`
          SELECT l.id, l.kode FROM "Loker" l
          WHERE l."lokasiId" = ${lokasi.id} AND l.kondisi = 'NORMAL'
            AND NOT EXISTS (SELECT 1 FROM "Peminjaman" p WHERE p."lokerId" = l.id AND p."selesaiAt" IS NULL)
          ORDER BY l.blok, l.baris, l.kolom
          LIMIT 1
          FOR UPDATE OF l SKIP LOCKED`;
        if (!loker) throw new GalatDomain("LOKER_PENUH", `Semua loker di ${lokasi.nama} sedang terpakai.`);
      }

      // Cek ulang setelah baris terkunci: pernyataan baru melihat transaksi lain yang sudah commit.
      const terpakai = await tx.peminjaman.count({ where: { lokerId: loker.id, selesaiAt: null } });
      if (terpakai > 0) {
        if (!input.lokerId) throw new CobaLagi();
        throw new GalatDomain(
          "LOKER_TIDAK_TERSEDIA",
          `Loker ${loker.kode} baru saja dipakai orang lain. Silakan pilih loker lain.`,
        );
      }

      const peminjaman = await tx.peminjaman.create({
        data: { peminjamId: peminjam.id, lokerId: loker.id, mulaiAt: sekarang, batasAt },
      });
      return { peminjaman, loker };
    });

  let hasil: Awaited<ReturnType<typeof jalankan>> | undefined;
  for (let percobaan = 0; !hasil; percobaan++) {
    try {
      hasil = await jalankan();
    } catch (err) {
      if (err instanceof CobaLagi && percobaan < 3) continue;
      if (err instanceof CobaLagi) {
        throw new GalatDomain("LOKER_PENUH", "Loker sedang ramai dipilih. Silakan coba lagi.");
      }
      throw err;
    }
  }

  const { peminjaman, loker } = hasil;
  const dasarLog = {
    penggunaId: input.penggunaId,
    peminjamId: input.peminjamId,
    lokerId: loker.id,
    lokasiId: lokasi.id,
  };
  const driver = driverUntuk(lokasi.modeKunci);
  const buka = await driver.buka({ id: loker.id, kode: loker.kode, lokasiId: lokasi.id });
  if (!buka.ok) {
    await prisma.peminjaman.delete({ where: { id: peminjaman.id } });
    await catatLog({ jenis: "KUNCI_GAGAL", ...dasarLog, detail: { aksi: "PINJAM", alasan: buka.alasan } });
    throw new GalatDomain(
      "KUNCI_GAGAL",
      `Loker ${loker.kode} gagal dibuka, peminjaman dibatalkan. Silakan hubungi petugas.`,
    );
  }
  await catatLog({
    jenis: "PINJAM",
    ...dasarLog,
    detail: { lokerKode: loker.kode, batasAt: batasAt.toISOString(), otomatis: !input.lokerId },
  });
  return {
    peminjamanId: peminjaman.id,
    lokerId: loker.id,
    lokerKode: loker.kode,
    batasAt: batasAt.toISOString(),
    zonaWaktu: lokasi.zonaWaktu,
    pesanBuka: driver.pesanBuka(loker.kode),
  };
}

type InputAksiPinjaman = {
  peminjamId: string;
  peminjamanId: string;
  lokasiId: string;
  penggunaId: string | null;
  pinTerverifikasi: boolean;
};

async function pinjamanMilik(input: InputAksiPinjaman) {
  const pinjaman = await prisma.peminjaman.findUnique({
    where: { id: input.peminjamanId },
    include: { loker: { include: { lokasi: true } } },
  });
  if (!pinjaman || pinjaman.peminjamId !== input.peminjamId) {
    throw new GalatDomain("TIDAK_DITEMUKAN", "Peminjaman tidak ditemukan.");
  }
  if (pinjaman.selesaiAt) throw new GalatDomain("SUDAH_SELESAI", "Peminjaman ini sudah selesai.");
  if (pinjaman.loker.lokasiId !== input.lokasiId) {
    throw new GalatDomain(
      "BEDA_LOKASI",
      `Loker ${pinjaman.loker.kode} ada di ${pinjaman.loker.lokasi.nama}. Silakan ke lokasi tersebut.`,
    );
  }
  if (pinjaman.loker.lokasi.wajibPin && !input.pinTerverifikasi) {
    throw new GalatDomain("PERLU_PIN", "Masukkan PIN terlebih dulu.");
  }
  return pinjaman;
}

export async function bukaUlang(input: InputAksiPinjaman) {
  const pinjaman = await pinjamanMilik(input);
  const { loker } = pinjaman;
  const dasarLog = {
    penggunaId: input.penggunaId,
    peminjamId: pinjaman.peminjamId,
    lokerId: loker.id,
    lokasiId: loker.lokasiId,
  };
  const driver = driverUntuk(loker.lokasi.modeKunci);
  const buka = await driver.buka({ id: loker.id, kode: loker.kode, lokasiId: loker.lokasiId });
  if (!buka.ok) {
    await catatLog({ jenis: "KUNCI_GAGAL", ...dasarLog, detail: { aksi: "BUKA_ULANG", alasan: buka.alasan } });
    throw new GalatDomain("KUNCI_GAGAL", `Loker ${loker.kode} gagal dibuka. Silakan hubungi petugas.`);
  }
  await catatLog({ jenis: "BUKA_ULANG", ...dasarLog, detail: { lokerKode: loker.kode } });
  return { lokerKode: loker.kode, pesanBuka: driver.pesanBuka(loker.kode) };
}

export async function kembalikanLoker(input: InputAksiPinjaman, sekarang = new Date()) {
  const pinjaman = await pinjamanMilik(input);
  const { loker } = pinjaman;
  const dasarLog = {
    penggunaId: input.penggunaId,
    peminjamId: pinjaman.peminjamId,
    lokerId: loker.id,
    lokasiId: loker.lokasiId,
  };
  const driver = driverUntuk(loker.lokasi.modeKunci);
  // Pintu dibuka dulu agar barang bisa diambil; peminjaman baru diakhiri bila berhasil.
  const buka = await driver.buka({ id: loker.id, kode: loker.kode, lokasiId: loker.lokasiId });
  if (!buka.ok) {
    await catatLog({ jenis: "KUNCI_GAGAL", ...dasarLog, detail: { aksi: "KEMBALI", alasan: buka.alasan } });
    throw new GalatDomain(
      "KUNCI_GAGAL",
      `Loker ${loker.kode} gagal dibuka, peminjaman belum diakhiri. Silakan hubungi petugas.`,
    );
  }
  const { count } = await prisma.peminjaman.updateMany({
    where: { id: pinjaman.id, selesaiAt: null },
    data: { selesaiAt: sekarang, caraSelesai: "NORMAL" },
  });
  if (count === 0) throw new GalatDomain("SUDAH_SELESAI", "Peminjaman ini sudah selesai.");
  const terlambat = pinjaman.batasAt < sekarang;
  await catatLog({ jenis: "KEMBALI", ...dasarLog, detail: { lokerKode: loker.kode, terlambat } });
  return { lokerKode: loker.kode, terlambat, pesanBuka: driver.pesanBuka(loker.kode) };
}

const skemaAlasan = z.string().trim().min(3, "Alasan wajib diisi (minimal 3 huruf).").max(300);

function validasiAlasan(alasan: string) {
  const hasil = skemaAlasan.safeParse(alasan);
  if (!hasil.success) throw new GalatDomain("DATA_TIDAK_VALID", hasil.error.issues[0]!.message);
  return hasil.data;
}

/** Petugas: buka pintu tanpa PIN (mis. anggota lupa PIN / kartu hilang). */
export async function paksaBuka(input: { peminjamanId: string; alasan: string; penggunaId: string }) {
  const alasan = validasiAlasan(input.alasan);
  const pinjaman = await prisma.peminjaman.findUnique({
    where: { id: input.peminjamanId },
    include: { loker: { include: { lokasi: true } } },
  });
  if (!pinjaman) throw new GalatDomain("TIDAK_DITEMUKAN", "Peminjaman tidak ditemukan.");
  if (pinjaman.selesaiAt) throw new GalatDomain("SUDAH_SELESAI", "Peminjaman ini sudah selesai.");
  const { loker } = pinjaman;
  const dasarLog = {
    penggunaId: input.penggunaId,
    peminjamId: pinjaman.peminjamId,
    lokerId: loker.id,
    lokasiId: loker.lokasiId,
  };
  const driver = driverUntuk(loker.lokasi.modeKunci);
  const buka = await driver.buka({ id: loker.id, kode: loker.kode, lokasiId: loker.lokasiId });
  if (!buka.ok) {
    await catatLog({ jenis: "KUNCI_GAGAL", ...dasarLog, detail: { aksi: "PAKSA_BUKA", alasan: buka.alasan } });
    throw new GalatDomain("KUNCI_GAGAL", `Loker ${loker.kode} gagal dibuka.`);
  }
  await catatLog({ jenis: "PAKSA_BUKA", ...dasarLog, detail: { lokerKode: loker.kode, alasan } });
  return { lokerKode: loker.kode, pesanBuka: driver.pesanBuka(loker.kode) };
}

/** Petugas: akhiri peminjaman tanpa scan/PIN (alasan wajib). */
export async function paksaSelesai(
  input: { peminjamanId: string; alasan: string; penggunaId: string },
  sekarang = new Date(),
) {
  const alasan = validasiAlasan(input.alasan);
  const pinjaman = await prisma.peminjaman.findUnique({
    where: { id: input.peminjamanId },
    include: { loker: true },
  });
  if (!pinjaman) throw new GalatDomain("TIDAK_DITEMUKAN", "Peminjaman tidak ditemukan.");
  const { count } = await prisma.peminjaman.updateMany({
    where: { id: pinjaman.id, selesaiAt: null },
    data: { selesaiAt: sekarang, caraSelesai: "PAKSA", alasanPaksa: alasan },
  });
  if (count === 0) throw new GalatDomain("SUDAH_SELESAI", "Peminjaman ini sudah selesai.");
  await catatLog({
    jenis: "PAKSA_SELESAI",
    penggunaId: input.penggunaId,
    peminjamId: pinjaman.peminjamId,
    lokerId: pinjaman.lokerId,
    lokasiId: pinjaman.loker.lokasiId,
    detail: { lokerKode: pinjaman.loker.kode, alasan, terlambat: pinjaman.batasAt < sekarang },
  });
  return { lokerKode: pinjaman.loker.kode };
}
