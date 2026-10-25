import { connection, NextResponse } from "next/server";
import { ringkasanPublik } from "@/data/publik";

export async function GET() {
  await connection();
  return NextResponse.json(await ringkasanPublik(), { headers: { "Cache-Control": "no-store" } });
}
