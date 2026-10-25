import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { buatPengguna } from "@/domain/pengguna";
import { prisma } from "@/lib/db";

/**
 * Membuat akun admin pertama di server produksi (tanpa data demo).
 * Pemakaian: ADMIN_EMAIL=... ADMIN_NAMA=... ADMIN_PASSWORD=... npm run admin:buat
 * (variabel yang kosong akan ditanyakan).
 */
async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const tanya = async (env: string, label: string) => process.env[env] || (await rl.question(`${label}: `)).trim();
  const email = await tanya("ADMIN_EMAIL", "Email admin");
  const nama = await tanya("ADMIN_NAMA", "Nama admin");
  const password = await tanya("ADMIN_PASSWORD", "Password (min. 8 karakter)");
  rl.close();
  const admin = await buatPengguna({ nama, email, password, peran: "ADMIN" }, null);
  await prisma.pengaturan.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
  console.log(`Akun admin ${admin.email} dibuat. Masuk lewat /masuk.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
