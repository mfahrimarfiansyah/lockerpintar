import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, MessageCircleIcon } from "lucide-react";
import {
  AksiAnggota,
  FormUbahAnggota,
  TombolPaksaBuka,
  TombolPaksaSelesai,
} from "@/components/admin/aksi-peminjaman";
import { LABEL_LOG, tautanWa } from "@/components/admin/umum";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { aktivitasTerbaru, detailAnggota, ZONA_LAPORAN } from "@/data/admin";
import { wajibPeran } from "@/lib/sesi";
import { formatTanggalJam } from "@/lib/waktu";

export const metadata = { title: "Detail anggota" };

export default function HalamanDetailAnggota({ params }: PageProps<"/admin/anggota/[id]">) {
  return (
    <>
      <Link
        href="/admin/anggota"
        className="group flex w-fit items-center gap-1.5 rounded-md text-sm font-semibold text-kapur/70 outline-none hover:text-limau focus-visible:ring-3 focus-visible:ring-ring/60"
      >
        <ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
        Semua anggota
      </Link>
      <Suspense fallback={<Skeleton className="h-[480px] w-full" />}>
        <KontenDetail params={params} />
      </Suspense>
    </>
  );
}

async function KontenDetail({ params }: { params: Promise<{ id: string }> }) {
  await wajibPeran("ADMIN", "PETUGAS");
  const { id } = await params;
  const sekarang = new Date();
  const [m, log] = await Promise.all([detailAnggota(id), aktivitasTerbaru(20, null, id)]);
  if (!m) notFound();
  const wa = tautanWa(m.noWa);
  const aktif = m.peminjaman.filter((p) => !p.selesaiAt);

  const info: [string, React.ReactNode][] = [
    ["Nomor ID", <span key="nomor" className="tabular-nums">{m.nomorInduk}</span>],
    ["Unit", m.unit ?? "—"],
    [
      "WhatsApp",
      wa ? (
        <a key="wa" href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
          <MessageCircleIcon className="size-3.5" aria-hidden />+{m.noWa}
        </a>
      ) : (
        "—"
      ),
    ],
    ["Kartu", m.kodeKartu ? <code key="kartu" className="text-xs">{m.kodeKartu}</code> : "Belum terdaftar"],
    ["PIN", m.pinHash ? (m.pinTerkunciSampai && m.pinTerkunciSampai > sekarang ? "Terkunci sementara" : "Sudah dibuat") : "Belum dibuat"],
    ["Persetujuan data", m.setujuDataAt ? formatTanggalJam(m.setujuDataAt, ZONA_LAPORAN) : "Belum"],
    ["Terdaftar", formatTanggalJam(m.createdAt, ZONA_LAPORAN)],
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="anim-semprot huruf-judul teks-grafiti text-[2rem] leading-[0.95] text-balance sm:text-[2.6rem]">
          {m.nama}
        </h1>
        {m.status === "DIBLOKIR" ? <Badge variant="destructive">Diblokir</Badge> : <Badge variant="default">Aktif</Badge>}
      </div>
      {m.status === "DIBLOKIR" && m.alasanBlokir && (
        <p className="w-fit rounded-md border-2 border-tinta bg-magenta px-3 py-1.5 text-sm font-semibold text-tinta">
          Alasan blokir: {m.alasanBlokir}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-start">
        <Card selotip>
          <CardHeader>
            <CardTitle>Data</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-sm">
              {info.map(([label, nilai]) => (
                <div key={label} className="contents">
                  <dt className="font-medium text-muted-foreground">{label}</dt>
                  <dd className="min-w-0 font-semibold break-words">{nilai}</dd>
                </div>
              ))}
            </dl>
            <AksiAnggota peminjamId={m.id} diblokir={m.status === "DIBLOKIR"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ubah data</CardTitle>
          </CardHeader>
          <CardContent>
            <FormUbahAnggota peminjam={m} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat peminjaman</CardTitle>
        </CardHeader>
        <CardContent>
          <Table kartu>
            <TableHeader>
              <TableRow>
                <TableHead>Mulai</TableHead>
                <TableHead>Loker</TableHead>
                <TableHead>Batas</TableHead>
                <TableHead>Selesai</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {m.peminjaman.map((p) => {
                const tz = p.loker.lokasi.zonaWaktu;
                const terlambat = p.selesaiAt ? p.selesaiAt > p.batasAt : p.batasAt < sekarang;
                return (
                  <TableRow key={p.id}>
                    <TableCell data-label="Mulai" className="tabular-nums">
                      {formatTanggalJam(p.mulaiAt, tz)}
                    </TableCell>
                    <TableCell data-label="Loker">
                      <span>
                        <span className="huruf-stensil text-lg leading-none font-extrabold">{p.loker.kode}</span>
                        <span className="text-xs text-muted-foreground"> · {p.loker.lokasi.nama}</span>
                      </span>
                    </TableCell>
                    <TableCell data-label="Batas" className="tabular-nums">
                      {formatTanggalJam(p.batasAt, tz)}
                    </TableCell>
                    <TableCell data-label="Selesai" className="tabular-nums">
                      {p.selesaiAt ? formatTanggalJam(p.selesaiAt, tz) : "—"}
                    </TableCell>
                    <TableCell data-label="Status">
                      {!p.selesaiAt ? (
                        terlambat ? <Badge variant="destructive">Terlambat</Badge> : <Badge variant="secondary">Aktif</Badge>
                      ) : (
                        <Badge variant="outline">{p.caraSelesai === "PAKSA" ? "Diakhiri paksa" : "Selesai"}</Badge>
                      )}
                    </TableCell>
                    <TableCell data-aksi {...(p.selesaiAt ? { "data-sembunyi-mobile": "" } : {})}>
                      {!p.selesaiAt && (
                        <div className="flex justify-end gap-1.5">
                          <TombolPaksaBuka peminjamanId={p.id} lokerKode={p.loker.kode} />
                          <TombolPaksaSelesai peminjamanId={p.id} lokerKode={p.loker.kode} />
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {m.peminjaman.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Belum pernah meminjam.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {aktif.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{aktif.length} peminjaman masih aktif.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log aktivitas</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2 text-sm">
            {log.map((l) => (
              <li key={l.id} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                <span className="huruf-stensil shrink-0 text-base leading-tight font-bold text-muted-foreground sm:w-40">
                  {formatTanggalJam(l.waktu, ZONA_LAPORAN)}
                </span>
                <span>
                  <span className="font-bold">{LABEL_LOG[l.jenis]}</span>
                  {l.lokerKode && <> · loker {l.lokerKode}</>}
                  {l.oleh && <span className="text-muted-foreground"> · oleh {l.oleh}</span>}
                  {l.alasan && <span className="text-muted-foreground"> · {l.alasan}</span>}
                </span>
              </li>
            ))}
            {log.length === 0 && <li className="text-muted-foreground">Belum ada aktivitas.</li>}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
