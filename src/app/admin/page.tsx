import { Suspense } from "react";
import Link from "next/link";
import { MessageCircleIcon } from "lucide-react";
import { TombolPaksaSelesai } from "@/components/admin/aksi-peminjaman";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { JudulHalaman, LABEL_LOG, tautanWa } from "@/components/admin/umum";
import { Stiker, TitikHidup, type WarnaStiker } from "@/components/grafiti";
import { GridLoker, LegendaStatus } from "@/components/grid-loker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { aktivitasTerbaru, peminjamanAktif, ringkasanDashboard, statusPerangkatKiosk, ZONA_LAPORAN } from "@/data/admin";
import { wajibPeran } from "@/lib/sesi";
import { cn } from "@/lib/utils";
import { formatJam, formatWaktuSingkat } from "@/lib/waktu";

export const metadata = { title: "Dashboard" };

export default function HalamanDashboard() {
  return (
    <>
      <JudulHalaman judul="Dashboard" deskripsi="Kondisi loker diperbarui otomatis setiap 5 detik." />
      <Suspense fallback={<Skeleton className="h-[480px] w-full" />}>
        <KontenDashboard />
      </Suspense>
    </>
  );
}

async function KontenDashboard() {
  const pengguna = await wajibPeran("ADMIN", "PETUGAS");
  const sekarang = new Date();
  const batasLokasi = pengguna.peran === "PETUGAS" ? pengguna.lokasiId : null;
  const [ringkas, aktif, kiosk, log] = await Promise.all([
    ringkasanDashboard(sekarang, batasLokasi),
    peminjamanAktif(sekarang, batasLokasi),
    statusPerangkatKiosk(sekarang),
    aktivitasTerbaru(12, batasLokasi),
  ]);

  const statistik: { label: string; nilai: number; warna: WarnaStiker; miring: number }[] = [
    { label: "Kosong", nilai: ringkas.total.kosong, warna: "limau", miring: -1.5 },
    { label: "Dipakai", nilai: ringkas.total.dipakai, warna: "kertas", miring: 1 },
    { label: "Terlambat", nilai: ringkas.total.terlambat, warna: ringkas.total.terlambat ? "magenta" : "kertas", miring: -0.5 },
    { label: "Pinjam hari ini", nilai: ringkas.pinjamHariIni, warna: "sian", miring: 1.5 },
  ];

  return (
    <>
      <AutoRefresh detik={5} />
      <dl className="grid grid-cols-2 gap-3.5 sm:gap-5 lg:grid-cols-4">
        {statistik.map((s, i) => (
          <Stiker key={s.label} warna={s.warna} miring={s.miring} urut={i} className="flex flex-col gap-1.5 px-4 py-3.5">
            <dt className="text-xs font-bold tracking-[0.08em] uppercase">{s.label}</dt>
            <dd className="huruf-stensil text-5xl leading-none font-black sm:text-6xl">{s.nilai}</dd>
          </Stiker>
        ))}
      </dl>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <div className="flex flex-col gap-6">
          {ringkas.lokasi.map((l) => (
            <Card key={l.id} selotip>
              <CardHeader>
                <CardTitle>{l.nama}</CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-x-1.5 font-medium">
                  <span className={cn("font-bold", l.sedangBuka ? "text-tinta" : "text-muted-foreground")}>
                    {l.sedangBuka ? "Buka" : "Tutup"}
                  </span>
                  · {l.jumlah.kosong} kosong · {l.jumlah.dipakai} dipakai · {l.jumlah.terlambat} terlambat
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <GridLoker loker={l.loker} />
                <LegendaStatus status={["KOSONG", "DIPAKAI", "TERLAMBAT", "PERBAIKAN"]} />
              </CardContent>
            </Card>
          ))}
          {ringkas.lokasi.length === 0 && (
            <Card>
              <CardContent className="text-sm text-muted-foreground">
                Belum ada lokasi aktif.{" "}
                <Link href="/admin/lokasi" className="font-semibold text-tinta underline">
                  Tambah lokasi
                </Link>
                .
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Peminjaman aktif ({aktif.length})</CardTitle>
            <CardDescription>Yang terlambat ditampilkan paling atas.</CardDescription>
          </CardHeader>
          <CardContent>
            {aktif.length === 0 ? (
              <p className="rounded-md border-2 border-dashed border-tinta/25 p-6 text-center text-sm font-medium text-muted-foreground">
                Tidak ada peminjaman aktif.
              </p>
            ) : (
              <Table kartu>
                <TableHeader>
                  <TableRow>
                    <TableHead>Anggota</TableHead>
                    <TableHead>Loker</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...aktif]
                    .sort((a, b) => Number(b.terlambat) - Number(a.terlambat))
                    .map((p) => {
                      const wa = tautanWa(
                        p.noWa,
                        `Halo ${p.nama}, loker ${p.lokerKode} di ${p.lokasiNama} sudah melewati batas waktu. Mohon segera dikembalikan. Terima kasih.`,
                      );
                      return (
                        <TableRow key={p.id} className={cn(p.terlambat && "bg-magenta/10")}>
                          <TableCell data-utama>
                            <Link href={`/admin/anggota/${p.peminjamId}`} className="font-bold hover:underline">
                              {p.nama}
                            </Link>
                            <div className="text-xs text-muted-foreground tabular-nums">{p.nomor}</div>
                          </TableCell>
                          <TableCell data-label="Loker">
                            <div>
                              <span className="huruf-stensil text-lg leading-none font-extrabold">{p.lokerKode}</span>
                              <div className="text-xs text-muted-foreground">{p.lokasiNama}</div>
                            </div>
                          </TableCell>
                          <TableCell data-label="Waktu" className="tabular-nums">
                            <div>
                              {formatWaktuSingkat(p.mulaiAt, sekarang, p.zonaWaktu)}
                              <div className="text-xs text-muted-foreground">
                                batas {formatWaktuSingkat(p.batasAt, sekarang, p.zonaWaktu)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell data-label="Status">
                            {p.terlambat ? <Badge variant="destructive">Terlambat</Badge> : <Badge variant="secondary">Aktif</Badge>}
                          </TableCell>
                          <TableCell data-aksi>
                            <div className="flex justify-end gap-1.5">
                              {wa && (
                                <a
                                  href={wa}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex h-7 items-center gap-1 rounded-sm border-2 border-tinta bg-background px-2 text-xs font-semibold shadow-[2px_2px_0_0_var(--tinta)] hover:bg-muted"
                                >
                                  <MessageCircleIcon className="size-3.5" aria-hidden />
                                  WA
                                </a>
                              )}
                              <TombolPaksaSelesai peminjamanId={p.id} lokerKode={p.lokerKode} />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Perangkat kiosk</CardTitle>
            <CardDescription>Online bila mengirim denyut dalam 30 detik terakhir.</CardDescription>
          </CardHeader>
          <CardContent>
            {kiosk.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada akun kiosk.</p>
            ) : (
              <ul className="flex flex-col divide-y-2 divide-dashed divide-tinta/15">
                {kiosk.map((k) => (
                  <li key={k.id} className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{k.nama}</span>
                      <span className="block text-xs text-muted-foreground">{k.lokasiNama}</span>
                    </span>
                    <span
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 rounded-[3px] border-[1.5px] px-2 py-0.5 text-xs font-bold",
                        k.aktif && k.online ? "border-tinta bg-tinta text-limau" : "border-tinta/30 text-muted-foreground",
                      )}
                    >
                      {k.aktif && k.online ? (
                        <TitikHidup className="size-2" />
                      ) : (
                        <span className="size-2 rounded-full bg-muted-foreground/60" aria-hidden />
                      )}
                      {!k.aktif
                        ? "Nonaktif"
                        : k.online
                          ? "Online"
                          : k.terakhirAktifAt
                            ? `Terakhir ${formatWaktuSingkat(k.terakhirAktifAt, sekarang, ZONA_LAPORAN)}`
                            : "Belum pernah terhubung"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aktivitas terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2.5 text-sm">
              {log.map((l) => (
                <li key={l.id} className="flex gap-3">
                  <span className="huruf-stensil w-12 shrink-0 pt-px text-base leading-tight font-bold text-muted-foreground">
                    {formatJam(l.waktu, ZONA_LAPORAN)}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "font-bold",
                        (l.jenis === "KUNCI_GAGAL" || l.jenis === "PIN_TERKUNCI") && "text-destructive",
                      )}
                    >
                      {LABEL_LOG[l.jenis]}
                    </span>
                    {l.lokerKode && <> · loker {l.lokerKode}</>}
                    {l.objek && <> · {l.objek}</>}
                    {l.peminjam && <> · {l.peminjam}</>}
                    {l.oleh && <span className="text-muted-foreground"> · oleh {l.oleh}</span>}
                    {l.alasan && <span className="block text-xs text-muted-foreground">Alasan: {l.alasan}</span>}
                  </span>
                </li>
              ))}
              {log.length === 0 && <li className="text-muted-foreground">Belum ada aktivitas.</li>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
