"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Pilih lokasi lewat parameter ?lokasi= (dipakai di scan petugas & simulator). */
export function PilihLokasi({ lokasi, terpilih }: { lokasi: { id: string; nama: string }[]; terpilih: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  if (lokasi.length <= 1) return null;
  return (
    <Select
      value={terpilih}
      onValueChange={(v) => {
        const p = new URLSearchParams(params);
        p.set("lokasi", v);
        router.replace(`${pathname}?${p.toString()}`);
      }}
    >
      <SelectTrigger className="w-full sm:w-64" aria-label="Pilih lokasi">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {lokasi.map((l) => (
          <SelectItem key={l.id} value={l.id}>
            {l.nama}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
