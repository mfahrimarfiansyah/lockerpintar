import { NextResponse, type NextRequest } from "next/server";
import { statusLokasi } from "@/data/publik";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const JEDA_DENYUT_MS = 15_000;

/** Status loker untuk layar kiosk/petugas, sekaligus denyut (heartbeat) akun kiosk. */
export async function GET(request: NextRequest) {
  const sesi = await auth.api.getSession({ headers: request.headers });
  if (!sesi?.user.aktif) return NextResponse.json({ pesan: "Sesi berakhir" }, { status: 401 });
  const { peran } = sesi.user;
  let lokasiId = request.nextUrl.searchParams.get("lokasi");

  if (peran === "KIOSK") {
    lokasiId = sesi.user.lokasiId ?? null;
    const kini = new Date();
    await prisma.pengguna.updateMany({
      where: {
        id: sesi.user.id,
        OR: [{ terakhirAktifAt: null }, { terakhirAktifAt: { lt: new Date(kini.getTime() - JEDA_DENYUT_MS) } }],
      },
      data: { terakhirAktifAt: kini },
    });
  } else if (peran !== "PETUGAS" && peran !== "ADMIN") {
    return NextResponse.json({ pesan: "Tidak berhak" }, { status: 403 });
  }
  if (!lokasiId) return NextResponse.json({ pesan: "Lokasi belum dipilih" }, { status: 400 });

  const data = await statusLokasi({ id: lokasiId }, { publik: peran === "KIOSK" });
  if (!data) return NextResponse.json({ pesan: "Lokasi tidak ditemukan atau nonaktif" }, { status: 404 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
