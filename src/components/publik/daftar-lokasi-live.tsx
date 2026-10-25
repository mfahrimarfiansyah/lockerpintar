"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRightIcon, ClockIcon, WifiOffIcon } from "lucide-react";
import type { LokasiPublik } from "@/data/publik";
import { cn } from "@/lib/utils";

async function ambil(): Promise<LokasiPublik[]> {
  const res = await fetch("/api/status", { cache: "no-store" });
  if (!res.ok) throw new Error("Gagal memuat status");
  return res.json();
}

const SEL_METER = 20;

/** Deretan pintu mini: proporsi loker kosong (limau) terhadap total. */
function MeterKetersediaan({ kosong, total }: { kosong: number; total: number }) {
  const sel = Math.min(total, SEL_METER);
  if (sel === 0) return null;
  const terisi = Math.round((kosong / total) * sel);
  return (
    <div className="flex gap-[3px]" aria-hidden>
      {Array.from({ length: sel }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-3 flex-1 rounded-[2px] border-[1.5px] border-tinta",
            i < terisi ? "bg-limau" : "bg-tinta/10",
          )}
        />
      ))}
    </div>
  );
}

export function DaftarLokasiLive({ awal }: { awal: LokasiPublik[] }) {
  const { data = awal, isError } = useQuery({ queryKey: ["status-semua"], queryFn: ambil, initialData: awal, refetchInterval: 5_000 });

  if (data.length === 0) {
    return (
      <p className="kertas permukaan-kertas rounded-md border-2 border-tinta p-6 text-center font-medium text-muted-foreground">
        Belum ada lokasi loker.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {isError && (
        <p className="flex items-center gap-2 rounded-md border-2 border-tinta bg-kuning px-3 py-2 text-sm font-semibold text-tinta">
          <WifiOffIcon className="size-4" aria-hidden />
          Koneksi terputus, menampilkan data terakhir.
        </p>
      )}
      <ul className="flex flex-col gap-5">
        {data.map((l, i) => {
          const penuh = l.jumlah.kosong === 0;
          return (
            <li key={l.slug} className="anim-naik" style={{ "--urut": i + 2 } as CSSProperties}>
              <Link
                href={`/lokasi/${l.slug}`}
                className={cn(
                  "kertas permukaan-kertas group relative flex flex-col gap-4 rounded-md border-2 border-tinta p-4 transition-[translate,box-shadow] duration-150 outline-none hover:-translate-x-0.5 hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-magenta sm:p-5",
                  penuh
                    ? "shadow-[5px_5px_0_0_var(--magenta)] hover:shadow-[7px_7px_0_0_var(--magenta)]"
                    : "shadow-[5px_5px_0_0_var(--limau)] hover:shadow-[7px_7px_0_0_var(--limau)]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="huruf-judul block truncate text-lg leading-tight sm:text-xl">{l.nama}</span>
                    {l.alamat && <span className="mt-1 block truncate text-sm text-muted-foreground">{l.alamat}</span>}
                  </div>
                  <ArrowUpRightIcon
                    className="size-6 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden
                  />
                </div>

                <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                  <div className="flex items-end gap-2.5">
                    <span
                      className={cn(
                        "huruf-stensil text-6xl leading-[0.78] font-black",
                        penuh && "text-muted-foreground",
                      )}
                    >
                      {l.jumlah.kosong}
                    </span>
                    <span className="pb-0.5 text-sm leading-tight font-bold">
                      {penuh ? (
                        "Penuh"
                      ) : (
                        <>
                          loker kosong
                          <span className="block font-medium text-muted-foreground">dari {l.jumlah.total}</span>
                        </>
                      )}
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold">
                    <span
                      className={cn(
                        "rounded-[3px] border-[1.5px] border-tinta px-1.5 py-0.5 text-[0.6875rem] font-bold tracking-[0.08em] uppercase",
                        l.sedangBuka ? "bg-limau" : "bg-tinta text-kertas",
                      )}
                    >
                      {l.sedangBuka ? "Buka" : "Tutup"}
                    </span>
                    <ClockIcon className="size-3.5 text-muted-foreground" aria-hidden />
                    <span className="text-muted-foreground tabular-nums">
                      {l.jamBuka.replace(":", ".")}–{l.jamTutup.replace(":", ".")}
                    </span>
                  </span>
                </div>

                <MeterKetersediaan kosong={l.jumlah.kosong} total={l.jumlah.total} />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
