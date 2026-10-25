import { Suspense } from "react";
import Link from "next/link";
import { FormImporAnggota } from "@/components/admin/aksi-peminjaman";
import { JudulHalaman } from "@/components/admin/umum";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { daftarAnggota, PER_HALAMAN } from "@/data/admin";
import { wajibPeran } from "@/lib/sesi";

export const metadata = { title: "Anggota" };

const SUMBER = { KIOSK: "Kiosk", IMPOR: "Impor", PETUGAS: "Petugas" } as const;

export default function HalamanAnggota({ searchParams }: PageProps<"/admin/anggota">) {
  return (
    <>
      <JudulHalaman judul="Anggota" deskripsi="Pemegang kartu yang terdaftar: status kartu, pinjaman aktif, dan blokir." />
      <Suspense fallback={<Skeleton className="h-[480px] w-full" />}>
        <KontenAnggota searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function KontenAnggota({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await wajibPeran("ADMIN", "PETUGAS");
  const p = await searchParams;
  const q = typeof p.q === "string" ? p.q : undefined;
  const status = typeof p.status === "string" ? p.status : undefined;
  const halaman = Math.max(1, Number(p.halaman) || 1);
  const { total, daftar } = await daftarAnggota(q, status, halaman);
  const jumlahHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));
  const tautan = (h: number) => `?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), halaman: String(h) })}`;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
      <Card>
        <CardContent className="flex flex-col gap-3">
          <form method="get" className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:flex-wrap">
            <Input name="q" defaultValue={q} placeholder="Cari nama atau nomor ID" className="col-span-2 sm:w-64" />
            <select
              name="status"
              defaultValue={status ?? ""}
              className="h-10 rounded-md border-2 border-input bg-background px-3 text-sm font-medium outline-none focus-visible:shadow-[3px_3px_0_0_var(--ring)]"
              aria-label="Filter status"
            >
              <option value="">Semua</option>
              <option value="diblokir">Diblokir</option>
              <option value="belum-kartu">Belum punya kartu</option>
            </select>
            <Button type="submit">Cari</Button>
          </form>
          <p className="text-sm font-semibold text-muted-foreground">{total} anggota</p>
          <Table kartu>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Nomor ID</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Kartu</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pinjaman aktif</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {daftar.map((m) => (
                <TableRow key={m.id}>
                  <TableCell data-utama>
                    <Link href={`/admin/anggota/${m.id}`} className="font-bold hover:underline">
                      {m.nama}
                    </Link>
                    <div className="text-xs text-muted-foreground">Sumber: {SUMBER[m.sumber]}</div>
                  </TableCell>
                  <TableCell data-label="Nomor ID" className="tabular-nums">
                    {m.nomorInduk}
                  </TableCell>
                  <TableCell data-label="Unit">{m.unit ?? "—"}</TableCell>
                  <TableCell data-label="Kartu">
                    {m.kodeKartu ? <Badge variant="secondary">Terdaftar</Badge> : <Badge variant="outline">Belum</Badge>}
                  </TableCell>
                  <TableCell data-label="Status">
                    {m.status === "DIBLOKIR" ? <Badge variant="destructive">Diblokir</Badge> : <Badge variant="outline">Aktif</Badge>}
                  </TableCell>
                  <TableCell data-label="Pinjaman aktif" className="huruf-stensil text-lg font-extrabold">
                    {m._count.peminjaman}
                  </TableCell>
                </TableRow>
              ))}
              {daftar.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Tidak ada data.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {jumlahHalaman > 1 && (
            <nav className="flex items-center justify-end gap-2 text-sm" aria-label="Halaman">
              {halaman > 1 && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={tautan(halaman - 1)}>Sebelumnya</Link>
                </Button>
              )}
              <span className="tabular-nums">
                {halaman} / {jumlahHalaman}
              </span>
              {halaman < jumlahHalaman && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={tautan(halaman + 1)}>Berikutnya</Link>
                </Button>
              )}
            </nav>
          )}
        </CardContent>
      </Card>

      <Card className="h-fit" selotip>
        <CardHeader>
          <CardTitle>Impor data anggota</CardTitle>
          <CardDescription>Anggota hasil impor tinggal scan kartu dan membuat PIN di kiosk.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormImporAnggota />
        </CardContent>
      </Card>
    </div>
  );
}
