import "dotenv/config";
import { execSync } from "node:child_process";

/** Menerapkan migrasi ke database uji sebelum seluruh tes berjalan. */
export default function setup() {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL_TEST belum diatur. Jalankan `npm run db:start` atau isi .env.");
  execSync("npx prisma migrate deploy", { stdio: "pipe", env: { ...process.env, DATABASE_URL: url } });
}
