import type { CSSProperties, ReactNode } from "react";
import { LockKeyholeIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TETES = [
  { x: 10, l: 3.5, p: 13 },
  { x: 31, l: 2.5, p: 24 },
  { x: 55, l: 4, p: 9 },
  { x: 78, l: 2.5, p: 18 },
];

/** Tetesan cat yang "meleleh" dari bawah tulisan (dekoratif). */
export function Tetesan({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden className={cn("pointer-events-none", className)}>
      {TETES.map((t, i) => (
        <path
          key={t.x}
          d={`M${t.x} 0h${t.l}v${t.p}a${t.l / 2} ${t.l / 2} 0 0 1-${t.l} 0z`}
          fill="currentColor"
          className="anim-tetes [transform-box:fill-box]"
          style={{ "--urut": i } as CSSProperties}
        />
      ))}
    </svg>
  );
}

/** Coretan spidol di bawah judul; tergambar saat halaman dibuka. */
export function Coretan({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden className={cn("pointer-events-none", className)}>
      <path
        d="M4 15C62 5 122 3 182 9s88 9 114-1"
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        className="anim-gores"
      />
      <path
        d="M24 21c70-7 150-7 236-3"
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity=".75"
        className="anim-gores"
        style={{ "--urut": 1 } as CSSProperties}
      />
    </svg>
  );
}

const UKURAN_LOGO = {
  sm: { ikon: "size-8 rounded-[8px]", gembok: "size-4", teks: "text-[1.45rem]", tetes: "-bottom-2.5 h-3" },
  md: { ikon: "size-9 rounded-[9px]", gembok: "size-[18px]", teks: "text-[1.7rem]", tetes: "-bottom-3 h-3.5" },
  lg: { ikon: "size-14 rounded-[14px] border-[3px]", gembok: "size-7", teks: "text-5xl sm:text-6xl", tetes: "-bottom-6 h-7" },
} as const;

/** Logo: stiker gembok + tag grafiti "LockerPintar". */
export function Logo({ ukuran = "md", className }: { ukuran?: keyof typeof UKURAN_LOGO; className?: string }) {
  const u = UKURAN_LOGO[ukuran];
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "grid shrink-0 -rotate-6 place-items-center border-2 border-tinta bg-limau text-tinta shadow-[3px_3px_0_0_var(--magenta)]",
          u.ikon,
        )}
      >
        <LockKeyholeIcon className={u.gembok} strokeWidth={2.6} aria-hidden />
      </span>
      <span className={cn("huruf-tag teks-grafiti-limau relative leading-none whitespace-nowrap", u.teks)}>
        LockerPintar
        <Tetesan className={cn("absolute left-[4%] w-[80%] text-limau", u.tetes)} />
      </span>
    </span>
  );
}

const WARNA_STIKER = {
  limau: "bg-limau shadow-[4px_4px_0_0_var(--magenta)]",
  magenta: "bg-magenta shadow-[4px_4px_0_0_var(--limau)]",
  kuning: "bg-kuning shadow-[4px_4px_0_0_var(--magenta)]",
  sian: "bg-sian shadow-[4px_4px_0_0_var(--magenta)]",
  kertas: "permukaan-kertas shadow-[4px_4px_0_0_var(--limau)]",
} as const;

export type WarnaStiker = keyof typeof WARNA_STIKER;

/** Stiker tebal berkontur tinta; `miring` dalam derajat, lurus kembali saat disorot. */
export function Stiker({
  warna = "kertas",
  miring = 0,
  urut,
  className,
  children,
}: {
  warna?: WarnaStiker;
  miring?: number;
  urut?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "kertas anim-tempel relative rounded-md border-2 border-tinta text-tinta transition-[rotate] duration-200 rotate-(--miring) hover:rotate-0",
        WARNA_STIKER[warna],
        className,
      )}
      style={{ "--miring": `${miring}deg`, "--urut": urut ?? 0 } as CSSProperties}
    >
      {children}
    </div>
  );
}

/** Titik "langsung" yang berdenyut (status diperbarui otomatis). */
export function TitikHidup({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex size-2.5", className)} aria-hidden>
      <span className="anim-denyut absolute inset-0 rounded-full bg-limau" />
      <span className="relative inline-flex size-2.5 rounded-full bg-limau shadow-[0_0_10px_var(--limau)]" />
    </span>
  );
}
