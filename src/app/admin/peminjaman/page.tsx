import { Suspense } from "react";
import Link from "next/link";
import { DownloadIcon } from "lucide-react";
import { TombolPaksaSelesai } from "@/components/admin/aksi-peminjaman";
import { JudulHalaman } from "@/components/admin/umum";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PER_HALAMAN, pilihanLokasi, riwayatPeminjaman, type FilterRiwayat } from "@/data/admin";
import { wajibPeran } from "@/lib/sesi";
import { formatTanggalJam } from "@/lib/waktu";

export const metadata = { title: "Peminjaman" };

type CariParams = Promise<Record<string, string | string[] | undefined>>;

const KELAS_SELECT =
  "h-10 w-full rounded-md border-2 border-input bg-background px-3 text-sm font-medium outline-none focus-visible:shadow-[3px_3px_0_0_var(--ring)] sm:w-auto";

export default function HalamanPeminjaman({ searchParams }: PageProps<"/admin/peminjaman">) {
  return (
    <>
      <JudulHalaman judul="Peminjaman" deskripsi="Riwayat semua peminjaman loker." />
      <Suspense fallback={<Skeleton className="h-[480px] w-full" />}>
        <KontenPeminjaman searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function teks(v: string | string[] | undefined) {
  return typeof v === "string" ? v : undefined;
}

async function KontenPeminjaman({ searchParams }: { searchParams: CariParams }) {
  const pengguna = await wajibPeran("ADMIN", "PETUGAS");
  const sekarang = new Date();
  const p = await searchParams;
  const filter: FilterRiwayat = {
    lokasiId: teks(p.lokasi),
    status: teks(p.status),
    dari: teks(p.dari),
    sampai: teks(p.sampai),
    q: teks(p.q),
  };
  const halaman = Math.max(1, Number(teks(p.halaman)) || 1);
  const batasLokasi = pengguna.peran === "PETUGAS" ? pengguna.lokasiId : null;
  const [lokasi, { total, daftar }] = await Promise.all([
    pilihanLokasi(batasLokasi),
    riwayatPeminjaman(filter, halaman, sekarang, batasLokasi),
  ]);
  const jumlahHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));
  const query = (ubah: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...filter, lokasi: filter.lokasiId, lokasiId: undefined, halaman: String(halaman), ...ubah })) {
      if (v) q.set(k, v);
    }
    return q.toString();
  };

  return (
    <>
      <Card>
        <CardContent>
          <form className="grid gap-3 sm:flex sm:flex-wrap sm:items-end" method="get">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q">Cari</Label>
              <Input id="q" name="q" defaultValue={filter.q} placeholder="Nama, nomor ID, atau kode loker" className="sm:w-60" />
            </div>
            {lokasi.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lokasi">Lokasi</Label>
                <select id="lokasi" name="lokasi" defaultValue={filter.lokasiId ?? ""} className={KELAS_SELECT}>
                  <option value="">Semua lokasi</option>
                  {lokasi.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nama}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" defaultValue={filter.status ?? ""} className={KELAS_SELECT}>
                <option value="">Semua</option>
                <option value="aktif">Aktif</option>
                <option value="terlambat">Terlambat</option>
                <option value="selesai">Selesai</option>
                <option value="paksa">Diakhiri paksa</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:contents">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dari">Dari tanggal</Label>
                <Input id="dari" name="dari" type="date" defaultValue={filter.dari} className="sm:w-44" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sampai">Sampai tanggal</Label>
                <Input id="sampai" name="sampai" type="date" defaultValue={filter.sampai} className="sm:w-44" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:contents">
              <Button type="submit">Terapkan</Button>
              <Button variant="ghost" asChild>
                <Link href="/admin/peminjaman">Reset</Link>
              </Button>
              <Button variant="outline" className="sm:ml-auto" asChild>
                <a href={`/admin/peminjaman/ekspor?${query({ halaman: undefined })}`}>
                  <DownloadIcon aria-hidden />
                  Ekspor Excel
                </a>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-muted-foreground">{total} peminjaman</p>
          <Table kartu>
            <TableHeader>
              <TableRow>
                <TableHead>Mulai</TableHead>
                <TableHead>Anggota</TableHead>
                <TableHead>Loker</TableHead>
                <TableHead>Batas</TableHead>
                <TableHead>Selesai</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {daftar.map((d) => {
                const tz = d.loker.lokasi.zonaWaktu;
                const terlambat = d.selesaiAt ? d.selesaiAt > d.batasAt : d.batasAt < sekarang;
                return (
                  <TableRow key={d.id}>
                    <TableCell data-label="Mulai" className="tabular-nums">
                      {formatTanggalJam(d.mulaiAt, tz)}
                    </TableCell>
                    <TableCell data-utama className="max-md:order-first">
                      <Link href={`/admin/anggota/${d.peminjamId}`} className="font-bold hover:underline">
                        {d.peminjam.nama}
                      </Link>
                      <div className="text-xs text-muted-foreground tabular-nums">{d.peminjam.nomorInduk}</div>
                    </TableCell>
                    <TableCell data-label="Loker">
                      <div>
                        <span className="huruf-stensil text-lg leading-none font-extrabold">{d.loker.kode}</span>
                        <div className="text-xs text-muted-foreground">{d.loker.lokasi.nama}</div>
                      </div>
                    </TableCell>
                    <TableCell data-label="Batas" className="tabular-nums">
                      {formatTanggalJam(d.batasAt, tz)}
                    </TableCell>
                    <TableCell data-label="Selesai" className="tabular-nums">
                      {d.selesaiAt ? formatTanggalJam(d.selesaiAt, tz) : "—"}
                    </TableCell>
                    <TableCell data-label="Status">
                      <div>
                        <div className="flex flex-wrap justify-end gap-1 md:justify-start">
                          {!d.selesaiAt ? (
                            terlambat ? (
                              <Badge variant="destructive">Terlambat</Badge>
                            ) : (
                              <Badge variant="secondary">Aktif</Badge>
                            )
                          ) : (
                            <Badge variant="outline">{d.caraSelesai === "PAKSA" ? "Diakhiri paksa" : "Selesai"}</Badge>
                          )}
                          {d.selesaiAt && terlambat && <Badge variant="destructive">Telat</Badge>}
                        </div>
                        {d.alasanPaksa && <div className="mt-1 text-xs text-muted-foreground">{d.alasanPaksa}</div>}
                      </div>
                    </TableCell>
                    <TableCell data-aksi className="text-right" {...(d.selesaiAt ? { "data-sembunyi-mobile": "" } : {})}>
                      {!d.selesaiAt && <TombolPaksaSelesai peminjamanId={d.id} lokerKode={d.loker.kode} />}
                    </TableCell>
                  </TableRow>
                );
              })}
              {daftar.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Tidak ada data.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {jumlahHalaman > 1 && (
            <nav className="flex items-center justify-end gap-2 text-sm" aria-label="Halaman">
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`?${query({ halaman: String(halaman - 1) })}`}
                  aria-disabled={halaman <= 1}
                  className={halaman <= 1 ? "pointer-events-none opacity-50" : undefined}
                >
                  Sebelumnya
                </Link>
              </Button>
              <span className="tabular-nums">
                {halaman} / {jumlahHalaman}
              </span>
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`?${query({ halaman: String(halaman + 1) })}`}
                  aria-disabled={halaman >= jumlahHalaman}
                  className={halaman >= jumlahHalaman ? "pointer-events-none opacity-50" : undefined}
                >
                  Berikutnya
                </Link>
              </Button>
            </nav>
          )}
        </CardContent>
      </Card>
    </>
  );
}
