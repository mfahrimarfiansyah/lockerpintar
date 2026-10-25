import { NextResponse, type NextRequest } from "next/server";
import { driverSimulasi, gagalBerikutnyaAktif } from "@/kunci";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const sesi = await auth.api.getSession({ headers: request.headers });
  if (!sesi?.user.aktif || sesi.user.peran !== "ADMIN") {
    return NextResponse.json({ pesan: "Tidak berhak" }, { status: 403 });
  }
  const lokasiId = request.nextUrl.searchParams.get("lokasi");
  const lokasi = lokasiId ? await prisma.lokasi.findUnique({ where: { id: lokasiId } }) : null;
  if (!lokasi) return NextResponse.json({ pesan: "Lokasi tidak ditemukan" }, { status: 404 });

  const loker = await prisma.loker.findMany({
    where: { lokasiId: lokasi.id, kondisi: { not: "NONAKTIF" } },
    orderBy: [{ blok: "asc" }, { baris: "asc" }, { kolom: "asc" }],
    select: {
      id: true,
      kode: true,
      blok: true,
      baris: true,
      kolom: true,
      lokasiId: true,
      peminjaman: { where: { selesaiAt: null }, select: { id: true }, take: 1 },
    },
  });
  const pintu = await Promise.all(
    loker.map(async (l) => ({
      id: l.id,
      kode: l.kode,
      blok: l.blok,
      baris: l.baris,
      kolom: l.kolom,
      dipinjam: l.peminjaman.length > 0,
      terbuka: (await driverSimulasi.status(l)) === "TERBUKA",
    })),
  );
  return NextResponse.json(
    { modeKunci: lokasi.modeKunci, gagalBerikutnya: gagalBerikutnyaAktif(lokasi.id), pintu },
    { headers: { "Cache-Control": "no-store" } },
  );
}
