import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";
import { FormLokasi, FormLokerMassal, PilihKondisiLoker } from "@/components/admin/form-lokasi";
import { GridLoker, LegendaStatus } from "@/components/grid-loker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { detailLokasiAdmin } from "@/data/admin";
import { wajibPeran } from "@/lib/sesi";

export const metadata = { title: "Atur lokasi" };

export default function HalamanDetailLokasi({ params }: PageProps<"/admin/lokasi/[id]">) {
  return (
    <>
      <Link
        href="/admin/lokasi"
        className="group flex w-fit items-center gap-1.5 rounded-md text-sm font-semibold text-kapur/70 outline-none hover:text-limau focus-visible:ring-3 focus-visible:ring-ring/60"
      >
        <ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
        Semua lokasi
      </Link>
      <Suspense fallback={<Skeleton className="h-[480px] w-full" />}>
        <Konten params={params} />
      </Suspense>
    </>
  );
}

async function Konten({ params }: { params: Promise<{ id: string }> }) {
  await wajibPeran("ADMIN");
  const { id } = await params;
  const data = await detailLokasiAdmin(id, new Date());
  if (!data) notFound();
  const { lokasi, status, loker } = data;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="anim-semprot huruf-judul teks-grafiti text-[2rem] leading-[0.95] text-balance sm:text-[2.6rem]">
          {lokasi.nama}
        </h1>
        <Link
          href={`/lokasi/${lokasi.slug}`}
          target="_blank"
          className="flex items-center gap-1 rounded-sm text-sm font-semibold text-kapur/70 outline-none hover:text-limau focus-visible:ring-3 focus-visible:ring-ring/60"
        >
          Lihat halaman publik <ExternalLinkIcon className="size-3.5" aria-hidden />
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
        <Card selotip>
          <CardHeader>
            <CardTitle>Pengaturan lokasi</CardTitle>
          </CardHeader>
          <CardContent>
            <FormLokasi awal={lokasi} />
          </CardContent>
        </Card>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Denah loker</CardTitle>
              <CardDescription>Loker nonaktif tidak ditampilkan di denah.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <GridLoker loker={status} />
              <LegendaStatus status={["KOSONG", "DIPAKAI", "TERLAMBAT", "PERBAIKAN"]} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Tambah loker</CardTitle>
            </CardHeader>
            <CardContent>
              <FormLokerMassal lokasiId={lokasi.id} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kondisi loker ({loker.length})</CardTitle>
          <CardDescription>Tandai “Perbaikan” agar loker tidak bisa dipinjam sementara.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table kartu>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Posisi</TableHead>
                <TableHead>Ukuran</TableHead>
                <TableHead>Kondisi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loker.map((l) => (
                <TableRow key={l.id}>
                  <TableCell data-utama className="huruf-stensil text-xl font-extrabold">
                    {l.kode}
                  </TableCell>
                  <TableCell data-label="Posisi" className="text-muted-foreground tabular-nums">
                    Blok {l.blok}, baris {l.baris}, kolom {l.kolom}
                  </TableCell>
                  <TableCell data-label="Ukuran">{l.ukuran ?? "—"}</TableCell>
                  <TableCell data-label="Kondisi">
                    <PilihKondisiLoker lokerId={l.id} kondisi={l.kondisi} kode={l.kode} />
                  </TableCell>
                </TableRow>
              ))}
              {loker.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Belum ada loker. Tambahkan lewat formulir di atas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
