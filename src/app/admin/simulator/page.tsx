import { Suspense } from "react";
import { PilihLokasi } from "@/components/admin/pilih-lokasi";
import { SimulatorKunci } from "@/components/admin/simulator-kunci";
import { JudulHalaman } from "@/components/admin/umum";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { pilihanLokasi } from "@/data/admin";
import { wajibPeran } from "@/lib/sesi";

export const metadata = { title: "Simulator kunci" };

export default function HalamanSimulator({ searchParams }: PageProps<"/admin/simulator">) {
  return (
    <>
      <JudulHalaman
        judul="Simulator kunci"
        deskripsi="Pintu loker virtual untuk uji coba sebelum hardware dipasang. Buka kiosk di tab lain lalu lihat pintunya terbuka di sini."
      />
      <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
        <Konten searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Konten({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await wajibPeran("ADMIN");
  const lokasi = await pilihanLokasi(null);
  if (lokasi.length === 0) return <p className="text-muted-foreground">Belum ada lokasi aktif.</p>;
  const { lokasi: diminta } = await searchParams;
  const terpilih = lokasi.find((l) => l.id === diminta) ?? lokasi[0];
  return (
    <div className="flex flex-col gap-4">
      <PilihLokasi lokasi={lokasi} terpilih={terpilih.id} />
      <Card>
        <CardContent>
          <SimulatorKunci key={terpilih.id} lokasiId={terpilih.id} />
        </CardContent>
      </Card>
    </div>
  );
}
