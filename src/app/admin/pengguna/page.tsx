import { Suspense } from "react";
import { AksiPengguna, FormPengguna } from "@/components/admin/form-pengguna";
import { JudulHalaman } from "@/components/admin/umum";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { daftarPengguna, pilihanLokasi, ZONA_LAPORAN } from "@/data/admin";
import { LABEL_PERAN } from "@/domain/pengguna";
import { wajibPeran } from "@/lib/sesi";
import { formatTanggalJam } from "@/lib/waktu";

export const metadata = { title: "Pengguna" };

export default function HalamanPengguna() {
  return (
    <>
      <JudulHalaman judul="Pengguna" deskripsi="Akun admin, petugas, dan tablet kiosk." />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Konten />
      </Suspense>
    </>
  );
}

async function Konten() {
  const saya = await wajibPeran("ADMIN");
  const [pengguna, lokasi] = await Promise.all([daftarPengguna(), pilihanLokasi(null)]);
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
      <Card>
        <CardContent>
          <Table kartu>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead>Terakhir aktif</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pengguna.map((p) => (
                <TableRow key={p.id}>
                  <TableCell data-utama>
                    <span className="font-bold">{p.nama}</span>
                    <div className="text-xs break-all text-muted-foreground">{p.email}</div>
                  </TableCell>
                  <TableCell data-label="Peran">{LABEL_PERAN[p.peran]}</TableCell>
                  <TableCell data-label="Lokasi">{p.lokasi?.nama ?? (p.peran === "ADMIN" ? "Semua" : "—")}</TableCell>
                  <TableCell data-label="Terakhir aktif" className="text-xs tabular-nums">
                    {p.terakhirAktifAt ? formatTanggalJam(p.terakhirAktifAt, ZONA_LAPORAN) : "—"}
                  </TableCell>
                  <TableCell data-label="Status">
                    {p.aktif ? <Badge variant="secondary">Aktif</Badge> : <Badge variant="outline">Nonaktif</Badge>}
                  </TableCell>
                  <TableCell data-aksi>
                    <AksiPengguna id={p.id} aktif={p.aktif} diriSendiri={p.id === saya.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card className="h-fit" selotip>
        <CardHeader>
          <CardTitle>Tambah akun</CardTitle>
          <CardDescription>Akun kiosk dipakai login sekali di tablet lokasi.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormPengguna lokasi={lokasi} />
        </CardContent>
      </Card>
    </div>
  );
}
