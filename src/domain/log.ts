import type { JenisLog, Prisma } from "@/generated/prisma/client";
import { prisma, type Tx } from "@/lib/db";

export type DataLog = {
  jenis: JenisLog;
  penggunaId?: string | null;
  peminjamId?: string | null;
  lokerId?: string | null;
  lokasiId?: string | null;
  detail?: Prisma.InputJsonValue;
};

export async function catatLog(data: DataLog, db: Tx | typeof prisma = prisma) {
  await db.logAktivitas.create({
    data: {
      jenis: data.jenis,
      penggunaId: data.penggunaId ?? null,
      peminjamId: data.peminjamId ?? null,
      lokerId: data.lokerId ?? null,
      lokasiId: data.lokasiId ?? null,
      detail: data.detail,
    },
  });
}
