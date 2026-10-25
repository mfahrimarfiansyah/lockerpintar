import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { Logo, Tetesan } from "@/components/grafiti";
import { Button } from "@/components/ui/button";

export default function TidakDitemukan() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-7 overflow-hidden px-4 py-16 text-center">
      <Link href="/" aria-label="LockerPintar, ke beranda" className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/60">
        <Logo ukuran="sm" />
      </Link>
      <p className="huruf-judul teks-grafiti-limau anim-semprot relative text-[7rem] leading-none sm:text-[10rem]" aria-hidden>
        404
        <Tetesan className="absolute -bottom-8 left-[8%] h-10 w-[84%] text-limau" />
      </p>
      <div className="hazard w-[calc(100%+4rem)] max-w-2xl -rotate-2 border-y-2 border-tinta py-1.5">
        <h1 className="mx-auto w-fit bg-tinta px-3 py-0.5 text-sm font-bold tracking-[0.25em] text-kuning uppercase">
          Halaman tidak ditemukan
        </h1>
      </div>
      <p className="max-w-md text-pretty text-kapur/75">
        Alamat yang Anda buka tidak ada atau sudah dipindah. Cek kembali tautannya, atau mulai dari beranda.
      </p>
      <Button asChild size="lg">
        <Link href="/">
          <ArrowLeftIcon aria-hidden />
          Kembali ke beranda
        </Link>
      </Button>
    </main>
  );
}
