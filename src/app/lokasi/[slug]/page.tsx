import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeftIcon } from "lucide-react";
import { FooterPublik, HeaderPublik } from "@/components/publik/header-publik";
import { StatusLokasiLive } from "@/components/publik/status-lokasi-live";
import { Skeleton } from "@/components/ui/skeleton";
import { statusLokasi } from "@/data/publik";

export const metadata = { title: "Ketersediaan loker" };

export default function HalamanLokasi({ params }: PageProps<"/lokasi/[slug]">) {
  return (
    <>
      <HeaderPublik />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 pt-6 pb-16 sm:px-6 lg:pt-10">
        <Link
          href="/"
          className="group flex w-fit items-center gap-1.5 rounded-md text-sm font-semibold text-kapur/70 outline-none hover:text-limau focus-visible:ring-3 focus-visible:ring-ring/60"
        >
          <ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
          Semua lokasi
        </Link>
        <Suspense fallback={<Skeleton className="h-[28rem] w-full" />}>
          <Konten params={params} />
        </Suspense>
      </main>
      <FooterPublik />
    </>
  );
}

async function Konten({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await connection();
  const data = await statusLokasi({ slug }, { publik: true });
  if (!data) notFound();
  return <StatusLokasiLive slug={slug} awal={data} />;
}
