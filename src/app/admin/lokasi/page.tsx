import { Suspense } from "react";
import Link from "next/link";
import { FormLokasi } from "@/components/admin/form-lokasi";
import { JudulHalaman } from "@/components/admin/umum";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { daftarLokasiAdmin } from "@/data/admin";
import { LABEL_MODE_KUNCI } from "@/domain/lokasi";
import { wajibPeran } from "@/lib/sesi";

export const metadata = { title: "Lokasi & loker" };

export default function HalamanLokasiAdmin() {
  return (
    <>
      <JudulHalaman judul="Lokasi & loker" deskripsi="Atur lokasi, jam layanan, jenis kunci, dan loker." />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Konten />
      </Suspense>
    </>
  );
}

async function Konten() {
  await wajibPeran("ADMIN");
  const lokasi = await daftarLokasiAdmin();
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
      <Card>
        <CardContent>
          <Table kartu>
            <TableHeader>
              <TableRow>
                <TableHead>Lokasi</TableHead>
                <TableHead>Jam</TableHead>
                <TableHead>Kunci</TableHead>
                <TableHead>Loker</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lokasi.map((l) => (
                <TableRow key={l.id}>
                  <TableCell data-utama>
                    <Link href={`/admin/lokasi/${l.id}`} className="font-bold hover:underline">
                      {l.nama}
                    </Link>
                    <div className="text-xs text-muted-foreground">/lokasi/{l.slug}</div>
                  </TableCell>
                  <TableCell data-label="Jam" className="tabular-nums">
                    {l.jamBuka.replace(":", ".")}–{l.jamTutup.replace(":", ".")}
                  </TableCell>
                  <TableCell data-label="Kunci">
                    <div>
                      {LABEL_MODE_KUNCI[l.modeKunci]}
                      <div className="text-xs text-muted-foreground">{l.wajibPin ? "Wajib PIN" : "Tanpa PIN"}</div>
                    </div>
                  </TableCell>
                  <TableCell data-label="Loker" className="huruf-stensil text-lg font-extrabold">
                    {l._count.loker}
                  </TableCell>
                  <TableCell data-label="Status">
                    {l.aktif ? <Badge variant="secondary">Aktif</Badge> : <Badge variant="outline">Nonaktif</Badge>}
                  </TableCell>
                </TableRow>
              ))}
              {lokasi.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Belum ada lokasi.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card className="h-fit" selotip>
        <CardHeader>
          <CardTitle>Tambah lokasi</CardTitle>
          <CardDescription>Setelah dibuat, tambahkan loker dan akun kiosk untuk lokasi ini.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormLokasi awal={null} />
        </CardContent>
      </Card>
    </div>
  );
}
