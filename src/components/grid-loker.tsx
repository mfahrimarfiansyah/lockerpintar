"use client";

import { LockIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LokerDenganStatus, StatusLoker } from "@/domain/ketersediaan";
import { KELAS_STATUS, KELAS_TITIK, LABEL_STATUS } from "./status-loker";

type Props = {
  loker: LokerDenganStatus[];
  /** Bila diisi, loker KOSONG bisa dipilih. */
  onPilih?: (loker: LokerDenganStatus) => void;
  pilihan?: string | null;
  besar?: boolean;
  className?: string;
};

/** Denah loker sebagai bank loker besi: tiap pintu punya kisi ventilasi, gagang, dan kode stensil. */
export function GridLoker({ loker, onPilih, pilihan, besar, className }: Props) {
  const perBlok = new Map<string, LokerDenganStatus[]>();
  for (const l of loker) perBlok.set(l.blok, [...(perBlok.get(l.blok) ?? []), l]);

  if (loker.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada loker di lokasi ini.</p>;
  }

  return (
    <div className={cn("logam flex flex-col gap-4 rounded-lg p-3 sm:p-4", className)}>
      {[...perBlok.entries()].map(([blok, daftar]) => {
        const kolom = Math.max(...daftar.map((l) => l.kolom));
        return (
          <div key={blok} className="flex flex-col gap-2">
            {perBlok.size > 1 && (
              <p className="huruf-stensil flex items-center gap-2 text-sm font-bold tracking-[0.22em] text-kapur/65 uppercase">
                Blok {blok}
                <span className="h-px flex-1 bg-white/10" aria-hidden />
              </p>
            )}
            <div className="grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${kolom}, minmax(0, 1fr))` }}>
              {daftar.map((l) => {
                const bisaDipilih = Boolean(onPilih) && l.status === "KOSONG";
                const dipilih = pilihan === l.id;
                const kelas = cn(
                  "@container relative isolate flex w-full min-w-0 flex-col items-center justify-end overflow-hidden rounded-[5px] border-2 transition-[translate,box-shadow,opacity,scale] duration-150",
                  besar ? "min-h-[4.5rem] pb-2 sm:min-h-20" : "min-h-12 pb-1.5",
                  "aspect-[5/4]",
                  KELAS_STATUS[l.status],
                  bisaDipilih &&
                    "cursor-pointer outline-none hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_var(--magenta)] focus-visible:ring-3 focus-visible:ring-kapur active:translate-y-0",
                  onPilih && !bisaDipilih && "opacity-40",
                  dipilih &&
                    "anim-pilih z-10 -rotate-2 scale-[1.04] shadow-[5px_5px_0_0_var(--magenta)] outline-3 outline-offset-2 outline-kapur outline-solid",
                );
                const isi = (
                  <>
                    <span
                      aria-hidden
                      className="absolute inset-x-[24%] top-[13%] h-[17%] bg-[repeating-linear-gradient(to_bottom,currentColor_0_2px,transparent_2px_5px)] opacity-25"
                    />
                    <span
                      aria-hidden
                      className="absolute top-[46%] right-[9%] h-[18%] w-[3px] -translate-y-1/2 rounded-full bg-current opacity-30"
                    />
                    {(l.status === "DIPAKAI" || l.status === "TERLAMBAT") && (
                      <LockIcon
                        aria-hidden
                        className="absolute top-[42%] left-[9%] size-3 -translate-y-1/2 opacity-45 @min-[7.5rem]:size-4"
                      />
                    )}
                    <span
                      className={cn(
                        "huruf-stensil relative leading-none font-extrabold tracking-wide",
                        besar
                          ? "text-xl @min-[7rem]:text-2xl"
                          : "text-sm @min-[5.5rem]:text-base @min-[7.5rem]:text-2xl",
                        l.status === "PERBAIKAN" && "rounded-[2px] bg-tinta px-1 py-0.5 text-kuning",
                      )}
                    >
                      {l.kode}
                    </span>
                    {besar && l.ukuran && <span className="relative mt-0.5 text-[0.6rem] font-bold opacity-70">{l.ukuran}</span>}
                  </>
                );
                const gaya = { gridRow: l.baris, gridColumn: l.kolom };
                return bisaDipilih ? (
                  <button
                    key={l.id}
                    type="button"
                    className={kelas}
                    style={gaya}
                    aria-pressed={dipilih}
                    aria-label={`Loker ${l.kode}, ${LABEL_STATUS[l.status].toLowerCase()}`}
                    onClick={() => onPilih?.(l)}
                  >
                    {isi}
                  </button>
                ) : (
                  <div
                    key={l.id}
                    className={kelas}
                    style={gaya}
                    role="img"
                    aria-label={`Loker ${l.kode}, ${LABEL_STATUS[l.status].toLowerCase()}`}
                  >
                    {isi}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LegendaStatus({
  status = ["KOSONG", "DIPAKAI", "PERBAIKAN"],
  className,
}: {
  status?: StatusLoker[];
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold text-muted-foreground", className)}>
      {status.map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className={cn("size-3.5 rounded-[3px] border-[1.5px]", KELAS_TITIK[s])} aria-hidden />
          {LABEL_STATUS[s]}
        </li>
      ))}
    </ul>
  );
}
