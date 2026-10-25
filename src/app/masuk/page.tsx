import { Suspense, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { FormMasuk, TombolKeluar } from "@/components/form-masuk";
import { Logo, Stiker } from "@/components/grafiti";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LABEL_PERAN } from "@/domain/pengguna";
import { ambilPengguna, berandaUntuk } from "@/lib/sesi";

export const metadata = { title: "Masuk" };

const SLOGAN = [
  { teks: "Scan.", kelas: "teks-grafiti-limau" },
  { teks: "Simpan.", kelas: "teks-grafiti" },
  { teks: "Beres.", kelas: "text-transparent [-webkit-text-stroke:2px_var(--kapur)]" },
];

export default function HalamanMasuk() {
  return (
    <main className="grid flex-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <section className="relative hidden overflow-hidden border-r border-white/10 lg:flex lg:flex-col lg:justify-between lg:gap-10 lg:p-12 xl:p-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-24 size-[28rem] rounded-full bg-limau/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 bottom-10 size-[24rem] rounded-full bg-magenta/20 blur-3xl"
        />
        <div
          aria-hidden
          className="hazard absolute top-14 -right-16 w-[26rem] rotate-[18deg] border-y-2 border-tinta py-1.5 shadow-[0_8px_20px_-6px_rgb(0_0_0/0.8)]"
        >
          <p className="mx-auto w-fit bg-tinta px-3 py-0.5 text-xs font-bold tracking-[0.3em] text-kuning">
            AREA STAF · AREA STAF
          </p>
        </div>

        <Link href="/" className="relative w-fit rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/60">
          <Logo ukuran="md" />
        </Link>

        <div className="relative flex flex-col gap-8">
          <p className="huruf-judul flex flex-col text-7xl leading-[0.9] xl:text-8xl">
            {SLOGAN.map((s, i) => (
              <span key={s.teks} className={`anim-semprot ${s.kelas}`} style={{ "--urut": i } as CSSProperties}>
                {s.teks}
              </span>
            ))}
          </p>
          <p className="max-w-md text-lg text-pretty text-kapur/75">
            Peminjam, loker, dan jam pinjam tercatat otomatis setiap kali kartu di-scan. Masuk untuk mengelola semuanya.
          </p>
        </div>

        <div className="relative flex flex-wrap gap-4" aria-hidden>
          <Stiker warna="limau" miring={-3} urut={3} className="px-3 py-2 text-sm font-bold">
            Tanpa ketik data
          </Stiker>
          <Stiker warna="kertas" miring={2} urut={4} className="px-3 py-2 text-sm font-bold">
            PIN terenkripsi
          </Stiker>
          <Stiker warna="sian" miring={-1} urut={5} className="px-3 py-2 text-sm font-bold">
            Semua aksi tercatat
          </Stiker>
        </div>
      </section>

      <section className="flex flex-col items-center justify-center gap-8 px-4 py-10 sm:px-6">
        <Link href="/" className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/60 lg:hidden">
          <Logo ukuran="md" />
        </Link>
        <Card selotip className="anim-tempel w-full max-w-sm shadow-[7px_7px_0_0_var(--magenta)]">
          <CardHeader>
            <CardTitle className="text-2xl">Masuk</CardTitle>
            <CardDescription>Untuk admin, petugas, dan tablet kiosk.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-56 w-full bg-tinta/10" />}>
              <Konten />
            </Suspense>
          </CardContent>
        </Card>
        <Link
          href="/"
          className="group flex items-center gap-1.5 rounded-md text-sm font-semibold text-kapur/70 outline-none hover:text-limau focus-visible:ring-3 focus-visible:ring-ring/60"
        >
          <ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
          Lihat ketersediaan loker
        </Link>
      </section>
    </main>
  );
}

async function Konten() {
  const pengguna = await ambilPengguna();
  if (!pengguna) return <FormMasuk />;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        Anda masuk sebagai <span className="font-bold">{pengguna.nama}</span> ({LABEL_PERAN[pengguna.peran]}).
      </p>
      <div className="flex gap-2">
        <Button asChild className="flex-1">
          <Link href={berandaUntuk(pengguna.peran)}>Lanjutkan</Link>
        </Button>
        <TombolKeluar />
      </div>
    </div>
  );
}
