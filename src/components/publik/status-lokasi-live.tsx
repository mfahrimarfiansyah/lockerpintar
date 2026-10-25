"use client";

import { useQuery } from "@tanstack/react-query";
import { ClockIcon, CreditCardIcon, MapPinIcon, WifiOffIcon } from "lucide-react";
import { Stiker, TitikHidup } from "@/components/grafiti";
import { GridLoker, LegendaStatus } from "@/components/grid-loker";
import type { StatusLokasi } from "@/data/publik";
import { cn } from "@/lib/utils";
import { formatJam } from "@/lib/waktu";

async function ambil(slug: string): Promise<StatusLokasi> {
  const res = await fetch(`/api/status/${slug}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Gagal memuat status");
  return res.json();
}

export function StatusLokasiLive({ slug, awal }: { slug: string; awal: StatusLokasi }) {
  const { data = awal, isError } = useQuery({
    queryKey: ["status-lokasi", slug],
    queryFn: () => ambil(slug),
    initialData: awal,
    refetchInterval: 5_000,
  });
  const { lokasi, jumlah } = data;
  const jam = `${lokasi.jamBuka.replace(":", ".")}–${lokasi.jamTutup.replace(":", ".")}`;

  const statistik = [
    { label: "Kosong", nilai: jumlah.kosong, warna: "limau", miring: -1.5 },
    { label: "Dipakai", nilai: jumlah.dipakai, warna: "kertas", miring: 1 },
    { label: "Perbaikan", nilai: jumlah.perbaikan, warna: "kuning", miring: -0.5 },
  ] as const;

  return (
    <section className="flex flex-col gap-7">
      <header className="flex flex-col gap-3">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-kapur/75">
          <span
            className={cn(
              "rounded-[3px] border-[1.5px] px-2 py-0.5 text-[0.6875rem] font-bold tracking-[0.08em] uppercase",
              lokasi.sedangBuka ? "border-tinta bg-limau text-tinta" : "border-kapur/40 text-kapur",
            )}
          >
            {lokasi.sedangBuka ? "Buka" : "Tutup"}
          </span>
          <span className="flex items-center gap-1.5">
            <ClockIcon className="size-4" aria-hidden />
            peminjaman pukul <span className="tabular-nums">{jam}</span>
          </span>
        </p>
        <h1 className="anim-semprot huruf-judul teks-grafiti text-[2.6rem] leading-[0.95] text-balance sm:text-6xl">
          {lokasi.nama}
        </h1>
        {lokasi.alamat && (
          <p className="flex items-center gap-1.5 text-kapur/70">
            <MapPinIcon className="size-4 shrink-0" aria-hidden />
            {lokasi.alamat}
          </p>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-8">
        <div className="flex flex-col gap-3 max-lg:order-2">
          <GridLoker loker={data.loker} />
          <LegendaStatus />
          <p className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
            {isError ? <WifiOffIcon className="size-3.5 text-destructive" aria-hidden /> : <TitikHidup className="size-2" />}
            {isError ? "Koneksi terputus, menampilkan data terakhir. " : ""}
            Diperbarui otomatis setiap 5 detik · terakhir {formatJam(data.diperbarui, lokasi.zonaWaktu)}
          </p>
        </div>

        <aside className="flex flex-col gap-5 max-lg:order-1 lg:sticky lg:top-24">
          <dl className="grid grid-cols-3 gap-2.5 lg:grid-cols-1 lg:gap-4">
            {statistik.map((s, i) => (
              <Stiker
                key={s.label}
                warna={s.warna}
                miring={s.miring}
                urut={i + 1}
                className="flex flex-col items-start gap-1 px-3 py-2.5 lg:flex-row lg:items-end lg:justify-between lg:px-4 lg:py-3"
              >
                <dt className="text-[0.6875rem] font-bold tracking-[0.08em] uppercase">{s.label}</dt>
                <dd className="huruf-stensil text-4xl leading-none font-black lg:text-5xl">{s.nilai}</dd>
              </Stiker>
            ))}
          </dl>
          <div className="hidden flex-col gap-2 rounded-md border border-white/10 bg-white/[0.03] p-4 text-sm text-kapur/80 lg:flex">
            <p className="flex items-center gap-2 font-bold text-kapur">
              <CreditCardIcon className="size-4 text-limau" aria-hidden />
              Cara meminjam
            </p>
            <p className="text-pretty">
              Datang ke kiosk di lokasi ini, scan kartu Anda, lalu pilih loker hijau. Peminjaman tercatat otomatis.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
