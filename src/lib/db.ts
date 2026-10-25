import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function buatPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL belum diatur. Jalankan `npm run db:start` atau isi .env.");
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString, connectionTimeoutMillis: 5_000 }),
  });
}

type KlienPrisma = ReturnType<typeof buatPrisma>;

// Satu instance untuk seluruh proses (hot reload di dev tidak membuat pool baru).
const globalPrisma = globalThis as unknown as { prismaLockerPintar?: KlienPrisma };

export const prisma: KlienPrisma = globalPrisma.prismaLockerPintar ?? buatPrisma();

if (process.env.NODE_ENV !== "production") globalPrisma.prismaLockerPintar = prisma;

export type Tx = Parameters<Parameters<KlienPrisma["$transaction"]>[0]>[0];
