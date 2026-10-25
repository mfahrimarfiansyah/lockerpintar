import { NextResponse, type NextRequest } from "next/server";
import { statusLokasi } from "@/data/publik";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/status/[slug]">) {
  const { slug } = await ctx.params;
  const data = await statusLokasi({ slug }, { publik: true });
  if (!data) return NextResponse.json({ pesan: "Lokasi tidak ditemukan" }, { status: 404 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
