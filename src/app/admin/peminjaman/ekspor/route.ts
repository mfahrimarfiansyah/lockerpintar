import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";
import { kondisiRiwayat } from "@/data/admin";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatTanggalJam } from "@/lib/waktu";

const MAKS_BARIS = 20_000;

export async function GET(request: NextRequest) {
  const sesi = await auth.api.getSession({ headers: request.headers });
  const peran = sesi?.user.aktif ? sesi.user.peran : null;
  if (peran !== "ADMIN" && peran !== "PETUGAS") {
    return NextResponse.json({ pesan: "Tidak berhak" }, { status: 403 });
  }
  const p = request.nextUrl.searchParams;
  const sekarang = new Date();
  const batasLokasi = peran === "PETUGAS" ? (sesi?.user.lokasiId ?? null) : null;
  const where = kondisiRiwayat(
    {
      lokasiId: p.get("lokasi") ?? undefined,
      status: p.get("status") ?? undefined,
      dari: p.get("dari") ?? undefined,
      sampai: p.get("sampai") ?? undefined,
      q: p.get("q") ?? undefined,
    },
    sekarang,
    batasLokasi,
  );
  const daftar = await prisma.peminjaman.findMany({
    where,
    include: { peminjam: true, loker: { include: { lokasi: true } } },
    orderBy: { mulaiAt: "desc" },
    take: MAKS_BARIS,
  });

  const buku = new ExcelJS.Workbook();
  buku.creator = "LockerPintar";
  const lembar = buku.addWorksheet("Peminjaman");
  lembar.columns = [
    { header: "Mulai", key: "mulai", width: 20 },
    { header: "Nomor ID", key: "nomor", width: 15 },
    { header: "Nama", key: "nama", width: 28 },
    { header: "Unit", key: "unit", width: 22 },
    { header: "Lokasi", key: "lokasi", width: 24 },
    { header: "Loker", key: "loker", width: 8 },
    { header: "Batas", key: "batas", width: 20 },
    { header: "Selesai", key: "selesai", width: 20 },
    { header: "Status", key: "status", width: 16 },
    { header: "Terlambat", key: "terlambat", width: 10 },
    { header: "Alasan paksa", key: "alasan", width: 30 },
  ];
  lembar.getRow(1).font = { bold: true };
  for (const d of daftar) {
    const tz = d.loker.lokasi.zonaWaktu;
    const terlambat = d.selesaiAt ? d.selesaiAt > d.batasAt : d.batasAt < sekarang;
    lembar.addRow({
      mulai: formatTanggalJam(d.mulaiAt, tz),
      nomor: d.peminjam.nomorInduk,
      nama: d.peminjam.nama,
      unit: d.peminjam.unit ?? "",
      lokasi: d.loker.lokasi.nama,
      loker: d.loker.kode,
      batas: formatTanggalJam(d.batasAt, tz),
      selesai: d.selesaiAt ? formatTanggalJam(d.selesaiAt, tz) : "",
      status: d.selesaiAt ? (d.caraSelesai === "PAKSA" ? "Diakhiri paksa" : "Selesai") : "Aktif",
      terlambat: terlambat ? "Ya" : "Tidak",
      alasan: d.alasanPaksa ?? "",
    });
  }
  const isi = await buku.xlsx.writeBuffer();
  const tanggal = sekarang.toISOString().slice(0, 10);
  return new NextResponse(isi as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="peminjaman-loker-${tanggal}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
