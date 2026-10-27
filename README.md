# LockerPintar

Website pinjam loker dengan scan kartu: anggota mengecek loker kosong, scan kartu identitasnya di kiosk, dan peminjamnya langsung tercatat.

Bisa dipakai di mana saja ada loker bersama: kantor, pabrik, gym, sekolah, kampus, perpustakaan, atau tempat wisata. Kartu yang dipakai bisa kartu karyawan, kartu member, kartu pelajar, atau kartu lain yang punya barcode, QR, atau chip RFID.

## Fitur versi 1

- **Halaman publik**: ketersediaan loker per lokasi tanpa login dan tanpa nama peminjam, diperbarui tiap 5 detik.
- **Kiosk** (tablet + scanner USB/kamera): registrasi sekali, pinjam (pilih sendiri atau otomatis), PIN untuk membuka loker yang sedang dipinjam, buka ulang, kembalikan, dan kembali ke layar awal otomatis.
- **Scan petugas**: alur yang sama dengan kiosk, ditambah cari nomor ID, paksa buka/selesai (alasan wajib), reset PIN, dan ganti kartu.
- **Dashboard**: statistik live, denah loker (terlambat berwarna magenta), peminjaman aktif dengan tombol WhatsApp, status kiosk online, dan aktivitas terbaru.
- **Riwayat** dengan filter dan ekspor Excel; data anggota dengan impor CSV/Excel dan blokir.
- **Admin**: lokasi dan loker (buat massal, tandai perbaikan), akun admin/petugas/kiosk, pengaturan, dan simulator kunci.
- **Driver kunci**: Simulasi dan Manual. ESP32 atau kunci vendor bisa ditambahkan nanti tanpa mengubah alur.

**Teknologi:** Next.js 16 (App Router, Cache Components) · TypeScript · PostgreSQL · Prisma 7 · Better Auth · Tailwind CSS 4 + shadcn/ui · TanStack Query · Vitest · Playwright.

## Tampilan

Gayanya grafiti "tembok kota":
- tembok gelap bertekstur beton sebagai latar;
- poster kertas yang ditempel untuk konten dan formulir;
- stiker untuk angka dan tombol;
- loker besi berlabel stensil untuk denah.

| Unsur | Pilihan |
|---|---|
| Warna | Limau (aksi utama, loker kosong) · magenta (bayangan 3D huruf, terlambat) · kuning + pita hazard (perbaikan) · sian (aksen) |
| Huruf | Bungee (judul) · Sedgwick Ave Display (logo tag) · Big Shoulders Stencil (kode loker, angka) · Barlow (teks) |

Teks di atas kertas memakai tinta hitam agar tetap mudah dibaca. Setiap bagian punya dua gaya:

| Bagian | Mobile | Desktop |
|---|---|---|
| Publik | Hero bertumpuk, kartu lokasi selebar layar | Hero besar di kiri dan daftar lokasi di kanan; denah dengan panel info yang tetap terlihat saat digulir |
| Kiosk | Panel aksi di atas denah (tablet potret, HP) | Bank loker di kiri, panel aksi di kanan (tablet lanskap ≥ 1024 px) |
| Admin | Top bar dan tab bar bawah (Dashboard, Scan, Pinjam, Anggota, Lainnya); tabel tampil sebagai kartu | Sidebar di kiri; tabel penuh |

Kode tampilan ada di tiga tempat:
- token warna di `src/app/globals.css`: `:root`/`.dinding` untuk tembok, `.kertas` untuk poster;
- elemen dekoratif (logo, stiker, tetesan cat) di `src/components/grafiti.tsx`;
- denah loker di `src/components/grid-loker.tsx`.

Animasi otomatis mati bila perangkat memakai pengaturan *kurangi gerakan* (reduce motion).

## Menjalankan di komputer

Prasyarat: Node.js 22+ (disarankan 24) dan PostgreSQL 17 (cukup binary-nya terpasang), atau Docker.

```bash
npm install
cp .env.example .env     # isi BETTER_AUTH_SECRET (petunjuk ada di file)
npm run db:start         # PostgreSQL khusus proyek di port 54329, DATABASE_URL ditulis ke .env
npm run db:deploy        # terapkan migrasi
npm run db:seed          # isi data demo
npm run dev              # buka http://localhost:3000
```

Bila memakai Docker, ganti `npm run db:start` dengan `docker compose up -d` dan isi `DATABASE_URL` sesuai komentar di `docker-compose.yml`. Untuk mematikan database lokal: `npm run db:stop`.

### Akun demo

| Peran | Email | Password |
|---|---|---|
| Admin | `admin@lockerpintar.local` | `admin113003#` |
| Petugas | `petugas@lockerpintar.local` | `petugas12345` |
| Kiosk Lobi Utama | `kiosk.lobi@lockerpintar.local` | `kiosk12345` |
| Kiosk Gedung B | `kiosk.gedungb@lockerpintar.local` | `kiosk12345` |

### Mencoba kiosk tanpa scanner

Masuk dengan akun kiosk. Di layar **Scan kartu Anda**, ketik kode kartu lalu tekan Enter; scanner USB bekerja dengan cara yang sama.

| Kode kartu | Kondisi |
|---|---|
| `1000045` | Budi (Keuangan): terdaftar, belum meminjam |
| `1000008` | Bayu (Operasional): sedang meminjam A-01 (PIN `1234`) |
| `1000012` | Siti (Pemasaran): terlambat mengembalikan A-05 (PIN `1234`) |
| `1000077` | Rudi (Gudang): diblokir |
| `1000031` | Nur (Umum): hasil impor, belum punya kartu & PIN |
| kode lain | kartu baru, masuk ke registrasi |

Lobi Utama (kunci simulasi, wajib PIN) melayani 00.00–23.59 agar bisa dicoba kapan saja. Gedung B (kunci manual, tanpa PIN) melayani 07.00–17.00. Buka **Admin → Simulator kunci** di tab lain untuk melihat pintu loker "terbuka" saat kiosk dipakai.

### Impor data anggota

Di **Admin → Anggota**, unggah file CSV/Excel dengan kolom minimal `nomor` dan `nama`. Kolom `unit` dan `no_wa` boleh ditambahkan. Nama kolom lain yang umum juga dikenali, misalnya `nik`, `nip`, `nim`, `id_anggota` untuk nomor ID, atau `divisi`, `departemen`, `kelas`, `prodi` untuk unit. Kartu tidak perlu diimpor: kartu otomatis tertaut saat anggota pertama kali scan di kiosk.

## Pengujian

```bash
npm test             # tes unit & domain (Vitest, database lockerpintar_test)
npm run test:e2e     # tes end-to-end (Playwright + Google Chrome; memakai database sementara)
npm run lint
npm run typecheck
```

## Struktur

```
src/app/          halaman publik, /kiosk, /admin, /masuk, dan API
src/aksi/         Server Actions (setiap aksi memeriksa sesi & peran)
src/domain/       aturan bisnis: pinjam, PIN, registrasi, ketersediaan, log (+ tes)
src/kunci/        driver kunci: simulasi, manual
src/data/         kueri baca untuk halaman
src/components/   UI: kiosk, admin, publik, grid loker, grafiti (logo, stiker), shadcn/ui
prisma/           skema, migrasi, seed
e2e/              tes Playwright
deploy/           Docker Compose produksi, Caddy, backup
```

## Deploy ke VPS

1. Pasang Docker di VPS dan arahkan domain (A record) ke IP VPS.
2. Salin proyek ke VPS (mis. `/opt/lockerpintar`), lalu jalankan:
   ```bash
   cp deploy/produksi.env.example deploy/.env   # isi DOMAIN, POSTGRES_PASSWORD, BETTER_AUTH_SECRET
   docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build
   docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env run --rm migrate npm run admin:buat
   ```
3. Masuk sebagai admin, lalu buat lokasi, loker, dan akun kiosk.
4. Pasang backup harian: tambahkan baris dari `deploy/backup.sh` ke crontab.

Simulator kunci dan pembatas laju disimpan di memori, jadi jalankan satu instance aplikasi saja.

## Menyiapkan tablet kiosk (Android)

1. Hubungkan scanner USB (mode keyboard/HID) lewat kabel OTG. Uji di aplikasi catatan: scan kartu harus mengetik kode lalu pindah baris.
2. Buka Pengaturan → Bahasa & input → Keyboard fisik, lalu aktifkan **Tampilkan keyboard virtual** agar form registrasi tetap bisa diisi.
3. Buka Chrome ke `https://domain-anda/masuk`, login dengan akun kiosk, lalu pilih menu ⋮ → **Instal aplikasi** / **Tambahkan ke layar utama**. Selanjutnya buka dari ikon tersebut (layar penuh).
4. Aktifkan **Sematkan aplikasi** (Pengaturan → Keamanan), lalu sematkan LockerPintar agar tablet tidak keluar dari kiosk.
5. Pasang charger permanen. Kiosk meminta Wake Lock agar layar tidak mati.

## Catatan keamanan

- Anggota tidak memakai akun. Identitasnya adalah kartu + PIN; PIN di-hash (scrypt) dan dikunci sementara setelah salah berulang kali.
- Halaman publik dan layar kiosk tidak menampilkan nama peminjam atau status terlambat. Nomor ID di kiosk disamarkan.
- Setiap Server Action dan API memeriksa sesi dan peran. Semua tindakan staf tercatat di log aktivitas.
- Ganti semua password demo sebelum dipakai sungguhan.

Rencana lengkap dan roadmap (sewa per jam, titip paket, mitra, SaaS) ada di [`docs/RENCANA.md`](docs/RENCANA.md).
