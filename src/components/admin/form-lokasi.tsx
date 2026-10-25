"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { aksiBuatLokerMassal, aksiSimpanLokasi, aksiUbahKondisiLoker } from "@/aksi/admin";
import type { KondisiLoker, ModeKunci } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAksi } from "./aksi-ui";

export const KELAS_SELECT =
  "h-10 w-full rounded-md border-2 border-input bg-background px-3 text-sm font-medium outline-none focus-visible:shadow-[3px_3px_0_0_var(--ring)] disabled:opacity-50";

type DataLokasi = {
  id: string;
  nama: string;
  slug: string;
  alamat: string | null;
  zonaWaktu: string;
  jamBuka: string;
  jamTutup: string;
  modeKunci: ModeKunci;
  wajibPin: boolean;
  aktif: boolean;
};

function jadikanSlug(teks: string) {
  return teks
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function FormLokasi({ awal }: { awal: DataLokasi | null }) {
  const router = useRouter();
  const { sibuk, jalankan } = useAksi();
  const [slug, setSlug] = useState(awal?.slug ?? "");
  const [slugDiubah, setSlugDiubah] = useState(Boolean(awal));
  const [wajibPin, setWajibPin] = useState(awal?.wajibPin ?? true);
  const [aktif, setAktif] = useState(awal?.aktif ?? true);

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const h = await jalankan(
          () =>
            aksiSimpanLokasi({
              id: awal?.id ?? null,
              nama: String(f.get("nama") ?? ""),
              slug,
              alamat: String(f.get("alamat") ?? ""),
              zonaWaktu: String(f.get("zonaWaktu") ?? "") as "Asia/Makassar",
              jamBuka: String(f.get("jamBuka") ?? ""),
              jamTutup: String(f.get("jamTutup") ?? ""),
              modeKunci: String(f.get("modeKunci") ?? "") as ModeKunci,
              wajibPin,
              aktif,
            }),
          () => (awal ? "Lokasi disimpan." : "Lokasi dibuat. Tambahkan lokernya."),
        );
        if (h?.ok && !awal) router.push(`/admin/lokasi/${h.data}`);
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lokasi-nama">Nama lokasi</Label>
        <Input
          id="lokasi-nama"
          name="nama"
          defaultValue={awal?.nama}
          required
          onChange={(e) => !slugDiubah && setSlug(jadikanSlug(e.target.value))}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lokasi-slug">Slug (alamat halaman publik)</Label>
        <Input
          id="lokasi-slug"
          value={slug}
          required
          onChange={(e) => {
            setSlugDiubah(true);
            setSlug(e.target.value);
          }}
        />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="lokasi-alamat">Keterangan tempat</Label>
        <Input id="lokasi-alamat" name="alamat" defaultValue={awal?.alamat ?? ""} placeholder="mis. Lantai 1, dekat pintu masuk" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lokasi-jam-buka">Jam buka peminjaman</Label>
        <Input id="lokasi-jam-buka" name="jamBuka" type="time" defaultValue={awal?.jamBuka ?? "07:00"} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lokasi-jam-tutup">Jam tutup (batas pengembalian)</Label>
        <Input id="lokasi-jam-tutup" name="jamTutup" type="time" defaultValue={awal?.jamTutup ?? "17:00"} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lokasi-zona">Zona waktu</Label>
        <select id="lokasi-zona" name="zonaWaktu" defaultValue={awal?.zonaWaktu ?? "Asia/Makassar"} className={KELAS_SELECT}>
          <option value="Asia/Jakarta">WIB (Asia/Jakarta)</option>
          <option value="Asia/Makassar">WITA (Asia/Makassar)</option>
          <option value="Asia/Jayapura">WIT (Asia/Jayapura)</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lokasi-mode">Jenis kunci</Label>
        <select id="lokasi-mode" name="modeKunci" defaultValue={awal?.modeKunci ?? "SIMULASI"} className={KELAS_SELECT}>
          <option value="SIMULASI">Simulasi (belum ada hardware)</option>
          <option value="MANUAL">Manual (kunci biasa, sistem hanya mencatat)</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="lokasi-pin" checked={wajibPin} onCheckedChange={setWajibPin} />
        <Label htmlFor="lokasi-pin">Wajib PIN saat membuka loker</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="lokasi-aktif" checked={aktif} onCheckedChange={setAktif} />
        <Label htmlFor="lokasi-aktif">Lokasi aktif</Label>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={sibuk}>
          {awal ? "Simpan lokasi" : "Buat lokasi"}
        </Button>
      </div>
    </form>
  );
}

export function FormLokerMassal({ lokasiId }: { lokasiId: string }) {
  const { sibuk, jalankan } = useAksi();
  return (
    <form
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        const h = await jalankan(() =>
          aksiBuatLokerMassal({
            lokasiId,
            blok: String(f.get("blok") ?? ""),
            baris: Number(f.get("baris")),
            kolom: Number(f.get("kolom")),
            ukuran: String(f.get("ukuran") ?? ""),
          }),
        );
        if (h?.ok) form.reset();
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="massal-blok">Blok / lemari</Label>
        <Input id="massal-blok" name="blok" placeholder="A" required maxLength={4} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="massal-baris">Baris</Label>
        <Input id="massal-baris" name="baris" type="number" min={1} max={20} defaultValue={2} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="massal-kolom">Kolom</Label>
        <Input id="massal-kolom" name="kolom" type="number" min={1} max={20} defaultValue={5} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="massal-ukuran">Ukuran</Label>
        <select id="massal-ukuran" name="ukuran" className={KELAS_SELECT} defaultValue="">
          <option value="">—</option>
          <option value="S">S</option>
          <option value="M">M</option>
          <option value="L">L</option>
        </select>
      </div>
      <p className="col-span-2 text-xs text-muted-foreground sm:col-span-4">
        Contoh: blok A, 2 baris × 5 kolom membuat A-01 sampai A-10. Nomor melanjutkan loker yang sudah ada di blok itu.
      </p>
      <div className="col-span-2 sm:col-span-4">
        <Button type="submit" disabled={sibuk}>
          Tambah loker
        </Button>
      </div>
    </form>
  );
}

export function PilihKondisiLoker({ lokerId, kondisi, kode }: { lokerId: string; kondisi: KondisiLoker; kode: string }) {
  const { sibuk, jalankan } = useAksi();
  return (
    <select
      aria-label={`Kondisi loker ${kode}`}
      className={cn(KELAS_SELECT, "h-9 w-36")}
      value={kondisi}
      disabled={sibuk}
      onChange={(e) => void jalankan(() => aksiUbahKondisiLoker({ lokerId, kondisi: e.target.value as KondisiLoker }))}
    >
      <option value="NORMAL">Normal</option>
      <option value="PERBAIKAN">Perbaikan</option>
      <option value="NONAKTIF">Nonaktif</option>
    </select>
  );
}
