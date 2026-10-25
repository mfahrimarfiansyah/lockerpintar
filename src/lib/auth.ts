import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db";

export const auth = betterAuth({
  appName: "LockerPintar",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    // Akun dibuat admin dari dashboard, tidak ada pendaftaran publik.
    disableSignUp: true,
    minPasswordLength: 8,
  },
  user: {
    modelName: "pengguna",
    fields: { name: "nama" },
    additionalFields: {
      peran: { type: "string", required: true, defaultValue: "PETUGAS", input: false },
      lokasiId: { type: "string", required: false, input: false },
      aktif: { type: "boolean", required: true, defaultValue: true, input: false },
    },
  },
  session: {
    modelName: "sesi",
    // Tablet kiosk login sekali; sesi diperpanjang selama dipakai.
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  account: { modelName: "akun" },
  verification: { modelName: "verifikasi" },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: { "/sign-in/email": { window: 60, max: 10 } },
  },
  databaseHooks: {
    session: {
      create: {
        // Akun nonaktif tidak bisa login.
        before: async (sesi) => {
          const pengguna = await prisma.pengguna.findUnique({ where: { id: sesi.userId }, select: { aktif: true } });
          if (!pengguna?.aktif) return false;
        },
      },
    },
  },
  plugins: [nextCookies()],
});
