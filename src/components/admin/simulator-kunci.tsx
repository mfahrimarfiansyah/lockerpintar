"use client";

import { useQuery } from "@tanstack/react-query";
import { aksiAturGagalSimulasi } from "@/aksi/admin";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAksi } from "./aksi-ui";

type DataSimulator = {
  modeKunci: "SIMULASI" | "MANUAL";
  gagalBerikutnya: boolean;
  pintu: { id: string; kode: string; blok: string; baris: number; kolom: number; terbuka: boolean; dipinjam: boolean }[];
};

async function ambil(lokasiId: string): Promise<DataSimulator> {
  const res = await fetch(`/api/simulator?lokasi=${encodeURIComponent(lokasiId)}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Gagal memuat simulator");
  return res.json();
}

/** Pintu loker virtual: menunjukkan efek scan di kiosk tanpa hardware. */
export function SimulatorKunci({ lokasiId }: { lokasiId: string }) {
  const { data, refetch } = useQuery({
    queryKey: ["simulator", lokasiId],
    queryFn: () => ambil(lokasiId),
    refetchInterval: 1_000,
  });
  const { sibuk, jalankan } = useAksi();

  if (!data) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  if (data.modeKunci !== "SIMULASI") {
    return (
      <p className="text-sm text-muted-foreground">
        Lokasi ini memakai kunci manual. Ubah jenis kunci menjadi Simulasi di menu Lokasi untuk memakai simulator.
      </p>
    );
  }

  const perBlok = new Map<string, DataSimulator["pintu"]>();
  for (const p of data.pintu) perBlok.set(p.blok, [...(perBlok.get(p.blok) ?? []), p]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3 rounded-md bg-muted p-3">
        <Switch
          id="gagal-berikutnya"
          checked={data.gagalBerikutnya}
          disabled={sibuk}
          onCheckedChange={async (v) => {
            await jalankan(() => aksiAturGagalSimulasi({ lokasiId, aktif: v }));
            void refetch();
          }}
        />
        <Label htmlFor="gagal-berikutnya" className="leading-snug">
          Buat pembukaan pintu berikutnya gagal (uji alur “kunci gagal”)
        </Label>
      </div>
      <div className="logam flex flex-col gap-4 rounded-lg p-3 sm:p-4">
        {[...perBlok.entries()].map(([blok, pintu]) => (
          <div key={blok} className="flex flex-col gap-2">
            <p className="huruf-stensil flex items-center gap-2 text-sm font-bold tracking-[0.22em] text-kapur/65 uppercase">
              Blok {blok}
              <span className="h-px flex-1 bg-white/10" aria-hidden />
            </p>
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${Math.max(...pintu.map((p) => p.kolom))}, minmax(0, 1fr))` }}
            >
              {pintu.map((p) => (
                <div
                  key={p.id}
                  style={{ gridRow: p.baris, gridColumn: p.kolom }}
                  className="relative min-h-20 min-w-0 rounded-[5px] bg-black [perspective:600px]"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-0 rounded-[5px] transition-opacity duration-500",
                      p.terbuka ? "bg-kuning/25 opacity-100 shadow-[inset_0_0_22px_var(--kuning)]" : "opacity-0",
                    )}
                  />
                  <div
                    className={cn(
                      "absolute inset-0 flex origin-left flex-col items-center justify-end overflow-hidden rounded-[5px] border-2 pb-2 transition-[transform,box-shadow] duration-500",
                      p.dipinjam ? "border-white/10 bg-[#2a2928] text-[#a19d95]" : "border-tinta bg-limau text-tinta",
                      p.terbuka && "[transform:rotateY(-38deg)] border-kuning shadow-[6px_0_18px_rgb(0_0_0/0.6)]",
                    )}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-x-[24%] top-[13%] h-[17%] bg-[repeating-linear-gradient(to_bottom,currentColor_0_2px,transparent_2px_5px)] opacity-25"
                    />
                    <span className="huruf-stensil relative text-lg leading-none font-extrabold">{p.kode}</span>
                    <span className="relative text-[0.65rem] font-bold">
                      {p.terbuka ? "Terbuka" : "Tertutup"}
                      {p.dipinjam ? " · dipinjam" : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs font-medium text-muted-foreground">
        Pintu yang dibuka lewat kiosk berayun terbuka dan menyala kuning selama 8 detik, lalu dianggap tertutup kembali.
      </p>
    </div>
  );
}
