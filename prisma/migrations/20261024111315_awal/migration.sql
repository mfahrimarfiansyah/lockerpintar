-- CreateEnum
CREATE TYPE "Peran" AS ENUM ('ADMIN', 'PETUGAS', 'KIOSK');

-- CreateEnum
CREATE TYPE "ModeKunci" AS ENUM ('SIMULASI', 'MANUAL');

-- CreateEnum
CREATE TYPE "KondisiLoker" AS ENUM ('NORMAL', 'PERBAIKAN', 'NONAKTIF');

-- CreateEnum
CREATE TYPE "StatusPeminjam" AS ENUM ('AKTIF', 'DIBLOKIR');

-- CreateEnum
CREATE TYPE "SumberPeminjam" AS ENUM ('KIOSK', 'IMPOR', 'PETUGAS');

-- CreateEnum
CREATE TYPE "CaraSelesai" AS ENUM ('NORMAL', 'PAKSA');

-- CreateEnum
CREATE TYPE "JenisLog" AS ENUM ('SCAN', 'REGISTRASI', 'PINJAM', 'BUKA_ULANG', 'KEMBALI', 'PIN_SALAH', 'PIN_TERKUNCI', 'DITOLAK', 'PAKSA_BUKA', 'PAKSA_SELESAI', 'RESET_PIN', 'GANTI_KARTU', 'BLOKIR', 'BUKA_BLOKIR', 'IMPOR', 'UBAH_DATA', 'KUNCI_GAGAL');

-- CreateTable
CREATE TABLE "Lokasi" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "alamat" TEXT,
    "zonaWaktu" TEXT NOT NULL DEFAULT 'Asia/Makassar',
    "jamBuka" TEXT NOT NULL DEFAULT '07:00',
    "jamTutup" TEXT NOT NULL DEFAULT '17:00',
    "modeKunci" "ModeKunci" NOT NULL DEFAULT 'SIMULASI',
    "wajibPin" BOOLEAN NOT NULL DEFAULT true,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lokasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loker" (
    "id" TEXT NOT NULL,
    "lokasiId" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "blok" TEXT NOT NULL,
    "baris" INTEGER NOT NULL,
    "kolom" INTEGER NOT NULL,
    "ukuran" TEXT,
    "kondisi" "KondisiLoker" NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Peminjam" (
    "id" TEXT NOT NULL,
    "nomorInduk" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "prodi" TEXT,
    "noWa" TEXT,
    "kodeKartu" TEXT,
    "pinHash" TEXT,
    "pinSalah" INTEGER NOT NULL DEFAULT 0,
    "pinTerkunciSampai" TIMESTAMP(3),
    "status" "StatusPeminjam" NOT NULL DEFAULT 'AKTIF',
    "alasanBlokir" TEXT,
    "sumber" "SumberPeminjam" NOT NULL,
    "setujuDataAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Peminjam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Peminjaman" (
    "id" TEXT NOT NULL,
    "peminjamId" TEXT NOT NULL,
    "lokerId" TEXT NOT NULL,
    "mulaiAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "batasAt" TIMESTAMP(3) NOT NULL,
    "selesaiAt" TIMESTAMP(3),
    "caraSelesai" "CaraSelesai",
    "alasanPaksa" TEXT,

    CONSTRAINT "Peminjaman_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogAktivitas" (
    "id" TEXT NOT NULL,
    "waktu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jenis" "JenisLog" NOT NULL,
    "penggunaId" TEXT,
    "peminjamId" TEXT,
    "lokerId" TEXT,
    "lokasiId" TEXT,
    "detail" JSONB,

    CONSTRAINT "LogAktivitas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pengguna" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "peran" "Peran" NOT NULL DEFAULT 'PETUGAS',
    "lokasiId" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "terakhirAktifAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pengguna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sesi" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Sesi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Akun" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Akun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verifikasi" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verifikasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pengaturan" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "maksPinjamPerOrang" INTEGER NOT NULL DEFAULT 1,
    "maksSalahPin" INTEGER NOT NULL DEFAULT 5,
    "lamaKunciPinMenit" INTEGER NOT NULL DEFAULT 5,
    "resetKioskDetik" INTEGER NOT NULL DEFAULT 10,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pengaturan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lokasi_slug_key" ON "Lokasi"("slug");

-- CreateIndex
CREATE INDEX "Loker_lokasiId_blok_baris_kolom_idx" ON "Loker"("lokasiId", "blok", "baris", "kolom");

-- CreateIndex
CREATE UNIQUE INDEX "Loker_lokasiId_kode_key" ON "Loker"("lokasiId", "kode");

-- CreateIndex
CREATE UNIQUE INDEX "Peminjam_nomorInduk_key" ON "Peminjam"("nomorInduk");

-- CreateIndex
CREATE UNIQUE INDEX "Peminjam_kodeKartu_key" ON "Peminjam"("kodeKartu");

-- CreateIndex
CREATE INDEX "Peminjaman_lokerId_selesaiAt_idx" ON "Peminjaman"("lokerId", "selesaiAt");

-- CreateIndex
CREATE INDEX "Peminjaman_peminjamId_selesaiAt_idx" ON "Peminjaman"("peminjamId", "selesaiAt");

-- CreateIndex
CREATE INDEX "Peminjaman_mulaiAt_idx" ON "Peminjaman"("mulaiAt");

-- CreateIndex
CREATE INDEX "LogAktivitas_waktu_idx" ON "LogAktivitas"("waktu");

-- CreateIndex
CREATE INDEX "LogAktivitas_peminjamId_idx" ON "LogAktivitas"("peminjamId");

-- CreateIndex
CREATE UNIQUE INDEX "Pengguna_email_key" ON "Pengguna"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Sesi_token_key" ON "Sesi"("token");

-- CreateIndex
CREATE INDEX "Sesi_userId_idx" ON "Sesi"("userId");

-- CreateIndex
CREATE INDEX "Akun_userId_idx" ON "Akun"("userId");

-- CreateIndex
CREATE INDEX "Verifikasi_identifier_idx" ON "Verifikasi"("identifier");

-- AddForeignKey
ALTER TABLE "Loker" ADD CONSTRAINT "Loker_lokasiId_fkey" FOREIGN KEY ("lokasiId") REFERENCES "Lokasi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Peminjaman" ADD CONSTRAINT "Peminjaman_peminjamId_fkey" FOREIGN KEY ("peminjamId") REFERENCES "Peminjam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Peminjaman" ADD CONSTRAINT "Peminjaman_lokerId_fkey" FOREIGN KEY ("lokerId") REFERENCES "Loker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAktivitas" ADD CONSTRAINT "LogAktivitas_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengguna" ADD CONSTRAINT "Pengguna_lokasiId_fkey" FOREIGN KEY ("lokasiId") REFERENCES "Lokasi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sesi" ADD CONSTRAINT "Sesi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Pengguna"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Akun" ADD CONSTRAINT "Akun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Pengguna"("id") ON DELETE CASCADE ON UPDATE CASCADE;
