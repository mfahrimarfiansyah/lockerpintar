import { Suspense } from "react";
import { PilihLokasi } from "@/components/admin/pilih-lokasi";
import { JudulHalaman } from "@/components/admin/umum";
import { AlurKiosk } from "@/components/kiosk/alur-kiosk";
import { Skeleton } from "@/components/ui/skeleton";
import { pilihanLokasi } from "@/data/admin";
import { statusLokasi } from "@/data/publik";
import { ambilPengaturan } from "@/domain/pengaturan";
import { wajibPeran } from "@/lib/sesi";

export const metadata = { title: "Scan petugas" };

export default function HalamanScan({ searchParams }: PageProps<"/admin/scan">) {
  return (
    <>
      <JudulHalaman
        judul="Scan petugas"
        deskripsi="Alur yang sama dengan kiosk, ditambah cari nomor ID manual, paksa buka/selesai, reset PIN, dan ganti kartu."
      />
      <Suspense fallback={<Skeleton className="h-[520px] w-full rounded-xl" />}>
        <KontenScan searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function KontenScan({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const pengguna = await wajibPeran("ADMIN", "PETUGAS");
  const lokasi = await pilihanLokasi(pengguna.peran === "PETUGAS" ? pengguna.lokasiId : null);
  if (lokasi.length === 0) return <p className="text-muted-foreground">Belum ada lokasi aktif.</p>;
  const { lokasi: diminta } = await searchParams;
  const terpilih = lokasi.find((l) => l.id === diminta) ?? lokasi[0];
  const [awal, pengaturan] = await Promise.all([
    statusLokasi({ id: terpilih.id }, { publik: false }),
    ambilPengaturan(),
  ]);
  return (
    <div className="flex flex-col gap-4">
      <PilihLokasi lokasi={lokasi} terpilih={terpilih.id} />
      <AlurKiosk
        key={terpilih.id}
        mode="petugas"
        lokasi={terpilih}
        resetDetik={pengaturan.resetKioskDetik}
        awal={awal ?? undefined}
      />
    </div>
  );
}
