import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { Logo } from "@/components/grafiti";

export function HeaderPublik() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-tembok/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          aria-label="LockerPintar, ke beranda"
          className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
        >
          <Logo ukuran="sm" />
        </Link>
        <Link
          href="/masuk"
          className="group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border-2 border-tepi px-3 text-sm font-semibold transition-colors outline-none hover:border-limau hover:text-limau focus-visible:ring-3 focus-visible:ring-ring/60"
        >
          Masuk staf
          <ArrowUpRightIcon
            className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden
          />
        </Link>
      </div>
    </header>
  );
}

export function FooterPublik() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span className="huruf-tag text-xl text-kapur/80">LockerPintar</span>
        <span>Cek loker, scan kartu, simpan barang.</span>
      </div>
    </footer>
  );
}
