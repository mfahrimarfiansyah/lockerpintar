import { Suspense, type CSSProperties } from "react";
import { connection } from "next/server";
import { Coretan, Stiker, TitikHidup, type WarnaStiker } from "@/components/grafiti";
import { DaftarLokasiLive } from "@/components/publik/daftar-lokasi-live";
import { FooterPublik, HeaderPublik } from "@/components/publik/header-publik";
import { Skeleton } from "@/components/ui/skeleton";
import { ringkasanPublik } from "@/data/publik";

const LANGKAH: { judul: string; isi: string; warna: WarnaStiker; miring: number }[] = [
  { judul: "Cek", isi: "Cari lokasi dengan loker hijau.", warna: "limau", miring: -2 },
  { judul: "Scan kartu", isi: "Tempelkan kartu di kiosk.", warna: "kertas", miring: 1.5 },
  { judul: "Simpan", isi: "Loker terbuka, barang aman.", warna: "sian", miring: -1 },
];

export default function Beranda() {
  return (
    <>
      <HeaderPublik />
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 pt-8 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14 lg:pt-16">
        <section className="flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start" aria-labelledby="judul-beranda">
          <p className="anim-naik inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold tracking-[0.14em] text-kapur/80 uppercase">
            <TitikHidup />
            Status loker langsung
          </p>
          <h1
            id="judul-beranda"
            className="anim-semprot huruf-judul teks-grafiti text-[2.85rem] leading-[0.95] text-balance sm:text-6xl lg:text-7xl xl:text-[5.25rem]"
          >
            Cari loker{" "}
            <span className="teks-grafiti-limau relative inline-block">
              kosong
              <Coretan className="absolute -bottom-3 left-0 h-4 w-full text-magenta sm:-bottom-4 sm:h-5" />
            </span>
          </h1>
          <p
            className="anim-naik max-w-md text-base text-pretty text-kapur/75 sm:text-lg"
            style={{ "--urut": 2 } as CSSProperties}
          >
            Lihat ketersediaan loker di setiap lokasi. Untuk meminjam, scan kartu Anda di kiosk dekat lemari loker.
          </p>
          <ol className="grid max-w-lg grid-cols-3 gap-2.5 pt-2 sm:gap-4" aria-label="Cara meminjam">
            {LANGKAH.map((l, i) => (
              <li key={l.judul}>
                <Stiker warna={l.warna} miring={l.miring} urut={i + 3} className="flex h-full flex-col gap-1 p-2.5 sm:p-3.5">
                  <span className="huruf-stensil text-3xl leading-none font-black sm:text-4xl" aria-hidden>
                    {i + 1}
                  </span>
                  <span className="text-sm leading-tight font-bold sm:text-base">{l.judul}</span>
                  <span className="text-xs leading-snug font-medium sm:text-sm">{l.isi}</span>
                </Stiker>
              </li>
            ))}
          </ol>
        </section>

        <section className="flex flex-col gap-4" aria-labelledby="judul-lokasi">
          <div className="flex items-end justify-between gap-3">
            <h2 id="judul-lokasi" className="huruf-judul text-xl">
              Lokasi loker
            </h2>
            <p className="text-xs font-semibold text-muted-foreground">diperbarui tiap 5 detik</p>
          </div>
          <Suspense fallback={<KerangkaDaftar />}>
            <DaftarLokasi />
          </Suspense>
        </section>
      </main>
      <FooterPublik />
    </>
  );
}

async function DaftarLokasi() {
  await connection();
  return <DaftarLokasiLive awal={await ringkasanPublik()} />;
}

function KerangkaDaftar() {
  return (
    <div className="flex flex-col gap-5" aria-busy>
      {[0, 1].map((i) => (
        <Skeleton key={i} className="h-44 w-full" />
      ))}
    </div>
  );
}
