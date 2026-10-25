import "dotenv/config";
import { buatLokerMassal } from "@/domain/lokasi";
import { buatPengguna } from "@/domain/pengguna";
import { prisma } from "@/lib/db";
import { hashPin } from "@/lib/hash-pin";
import { batasHariIni } from "@/lib/waktu";

const AKUN_STAF = [
  { nama: "Admin LockerPintar", email: "admin@lockerpintar.local", password: "admin12345", peran: "ADMIN" },
  { nama: "Petugas Loker", email: "petugas@lockerpintar.local", password: "petugas12345", peran: "PETUGAS" },
] as const;

async function main() {
  if ((await prisma.lokasi.count()) > 0) {
    console.log("Database sudah berisi data, seed dilewati. Jalankan `npm run db:reset` untuk mengulang dari awal.");
    return;
  }

  await prisma.pengaturan.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });

  // Lobi Utama dibuka sepanjang hari agar demo bisa dicoba kapan saja.
  const lobi = await prisma.lokasi.create({
    data: {
      nama: "Lobi Utama",
      slug: "lobi-utama",
      alamat: "Lantai dasar, dekat resepsionis",
      zonaWaktu: "Asia/Makassar",
      jamBuka: "00:00",
      jamTutup: "23:59",
      modeKunci: "SIMULASI",
      wajibPin: true,
    },
  });
  const gedungB = await prisma.lokasi.create({
    data: {
      nama: "Gedung B",
      slug: "gedung-b",
      alamat: "Lantai 2, sebelah lift",
      zonaWaktu: "Asia/Makassar",
      jamBuka: "07:00",
      jamTutup: "17:00",
      modeKunci: "MANUAL",
      wajibPin: false,
    },
  });

  const [admin] = await Promise.all(AKUN_STAF.map((a) => buatPengguna(a, null)));
  await buatPengguna(
    { nama: "Kiosk Lobi Utama", email: "kiosk.lobi@lockerpintar.local", password: "kiosk12345", peran: "KIOSK", lokasiId: lobi.id },
    admin.id,
  );
  await buatPengguna(
    { nama: "Kiosk Gedung B", email: "kiosk.gedungb@lockerpintar.local", password: "kiosk12345", peran: "KIOSK", lokasiId: gedungB.id },
    admin.id,
  );

  await buatLokerMassal(lobi.id, { blok: "A", baris: 2, kolom: 5 }, admin.id);
  await buatLokerMassal(lobi.id, { blok: "B", baris: 2, kolom: 5 }, admin.id);
  await buatLokerMassal(gedungB.id, { blok: "C", baris: 2, kolom: 6 }, admin.id);
  await prisma.loker.update({
    where: { lokasiId_kode: { lokasiId: lobi.id, kode: "A-10" } },
    data: { kondisi: "PERBAIKAN" },
  });

  const pin = await hashPin("1234");
  const sekarang = new Date();
  const sehari = 24 * 60 * 60 * 1000;
  // Nomor ID tertulis di barcode kartu, jadi kode kartu = nomor ID.
  const anggota = await Promise.all(
    [
      { nomorInduk: "1000045", nama: "Budi Santoso", unit: "Keuangan", noWa: "6281234500045" },
      { nomorInduk: "1000012", nama: "Siti Rahma", unit: "Pemasaran", noWa: "6281234500012" },
      { nomorInduk: "1000008", nama: "Bayu Pratama", unit: "Operasional", noWa: "6281234500008" },
      { nomorInduk: "1000077", nama: "Rudi Hartono", unit: "Gudang", noWa: "6281234500077" },
    ].map((a) =>
      prisma.peminjam.create({
        data: { ...a, kodeKartu: a.nomorInduk, pinHash: pin, sumber: "KIOSK", setujuDataAt: sekarang },
      }),
    ),
  );
  const [budi, siti, bayu, rudi] = anggota;
  await prisma.peminjam.update({
    where: { id: rudi.id },
    data: { status: "DIBLOKIR", alasanBlokir: "Tidak mengembalikan loker selama 3 hari" },
  });
  // Hasil impor: belum punya kartu & PIN, akan ditautkan saat scan pertama.
  await prisma.peminjam.create({
    data: { nomorInduk: "1000031", nama: "Nur Aisyah", unit: "Umum", sumber: "IMPOR" },
  });

  const loker = Object.fromEntries(
    (await prisma.loker.findMany({ where: { lokasiId: lobi.id } })).map((l) => [l.kode, l]),
  );
  const kemarin = new Date(sekarang.getTime() - sehari);
  const tz = lobi.zonaWaktu;
  const pinjaman = [
    // Siti: lewat batas sejak kemarin
    { peminjamId: siti.id, kode: "A-05", mulaiAt: new Date(kemarin.getTime() - 3 * 3600_000), batasAt: batasHariIni(kemarin, tz, "23:59") },
    // Bayu: sedang meminjam
    { peminjamId: bayu.id, kode: "A-01", mulaiAt: new Date(sekarang.getTime() - 3600_000), batasAt: batasHariIni(sekarang, tz, "23:59") },
  ];
  for (const { kode, ...p } of pinjaman) {
    await prisma.peminjaman.create({ data: { ...p, lokerId: loker[kode].id } });
    await prisma.logAktivitas.create({
      data: {
        jenis: "PINJAM",
        waktu: p.mulaiAt,
        peminjamId: p.peminjamId,
        lokerId: loker[kode].id,
        lokasiId: lobi.id,
        detail: { lokerKode: kode, seed: true },
      },
    });
  }
  // Riwayat yang sudah selesai
  await prisma.peminjaman.create({
    data: {
      peminjamId: budi.id,
      lokerId: loker["B-02"].id,
      mulaiAt: new Date(kemarin.getTime() - 5 * 3600_000),
      batasAt: batasHariIni(kemarin, tz, "23:59"),
      selesaiAt: new Date(kemarin.getTime() - 2 * 3600_000),
      caraSelesai: "NORMAL",
    },
  });

  console.log("Seed selesai. Akun demo:");
  console.table([
    ...AKUN_STAF.map((a) => ({ peran: a.peran, email: a.email, password: a.password })),
    { peran: "KIOSK", email: "kiosk.lobi@lockerpintar.local", password: "kiosk12345" },
    { peran: "KIOSK", email: "kiosk.gedungb@lockerpintar.local", password: "kiosk12345" },
  ]);
  console.log("Kartu demo (ketik lalu Enter di kiosk): 1000045 Budi, 1000012 Siti (terlambat),");
  console.log("1000008 Bayu (sedang pinjam), 1000077 Rudi (diblokir), 1000031 Nur (hasil impor). PIN: 1234");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
