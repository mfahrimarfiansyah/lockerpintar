import "dotenv/config";

// Modul database membaca DATABASE_URL saat pertama di-import; arahkan ke database uji.
const urlUji = process.env.DATABASE_URL_TEST;
if (!urlUji) throw new Error("DATABASE_URL_TEST belum diatur");
// Tes mengosongkan tabel: tolak bila bukan database uji.
if (!/test/i.test(new URL(urlUji).pathname)) {
  throw new Error("DATABASE_URL_TEST harus menunjuk ke database khusus uji (nama mengandung 'test').");
}
process.env.DATABASE_URL = urlUji;
