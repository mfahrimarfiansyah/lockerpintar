import { Suspense } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { TombolKeluar } from "@/components/form-masuk";
import { AlurKiosk } from "@/components/kiosk/alur-kiosk";
import { statusLokasi } from "@/data/publik";
import { ambilPengaturan } from "@/domain/pengaturan";
import { wajibPeran } from "@/lib/sesi";

export const metadata = { title: "Kiosk" };

export default function HalamanKiosk() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <LoaderCircleIcon className="size-10 animate-spin text-limau" aria-label="Memuat" />
        </div>
      }
    >
      <KontenKiosk />
    </Suspense>
  );
}

async function KontenKiosk() {
  const pengguna = await wajibPeran("KIOSK");
  const [awal, pengaturan] = await Promise.all([
    pengguna.lokasiId ? statusLokasi({ id: pengguna.lokasiId }, { publik: true }) : null,
    ambilPengaturan(),
  ]);
  if (!awal) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 p-6 text-center">
        <p className="huruf-judul teks-grafiti text-3xl">Kiosk belum siap dipakai</p>
        <p className="max-w-md text-kapur/75">
          Akun {pengguna.nama} belum dipasangkan ke lokasi yang aktif. Minta admin mengatur lokasi akun ini.
        </p>
        <TombolKeluar />
      </div>
    );
  }
  return (
    <AlurKiosk
      mode="kiosk"
      lokasi={{ id: awal.lokasi.id, nama: awal.lokasi.nama, zonaWaktu: awal.lokasi.zonaWaktu }}
      resetDetik={pengaturan.resetKioskDetik}
      awal={awal}
    />
  );
}
