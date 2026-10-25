import { Suspense } from "react";
import { FormPengaturan } from "@/components/admin/form-pengguna";
import { JudulHalaman } from "@/components/admin/umum";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ambilPengaturan } from "@/domain/pengaturan";
import { wajibPeran } from "@/lib/sesi";

export const metadata = { title: "Pengaturan" };

export default function HalamanPengaturan() {
  return (
    <>
      <JudulHalaman
        judul="Pengaturan"
        deskripsi="Aturan peminjaman. Jam layanan, PIN wajib, dan jenis kunci diatur per lokasi."
      />
      <Suspense fallback={<Skeleton className="h-80 w-full max-w-xl" />}>
        <Konten />
      </Suspense>
    </>
  );
}

async function Konten() {
  await wajibPeran("ADMIN");
  return (
    <Card className="max-w-2xl" selotip>
      <CardContent>
        <FormPengaturan awal={await ambilPengaturan()} />
      </CardContent>
    </Card>
  );
}
