"use client";

import { useState } from "react";
import { LoaderCircleIcon } from "lucide-react";
import type { SaranRegistrasi } from "@/domain/pindai";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type DataRegistrasi = {
  nomorInduk: string;
  nama: string;
  unit: string;
  noWa: string;
  pin: string;
  setuju: boolean;
};

type Props = {
  saran: SaranRegistrasi | null;
  sibuk: boolean;
  galat: string | null;
  onKirim: (data: DataRegistrasi) => void;
  onBatal: () => void;
};

export function FormRegistrasi({ saran, sibuk, galat, onKirim, onBatal }: Props) {
  const [setuju, setSetuju] = useState(false);
  const [galatLokal, setGalatLokal] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const pin = String(f.get("pin") ?? "");
        if (!/^\d{4,6}$/.test(pin)) return setGalatLokal("PIN harus 4–6 angka.");
        if (pin !== String(f.get("pinUlang") ?? "")) return setGalatLokal("Ulangi PIN tidak sama.");
        if (!setuju) return setGalatLokal("Centang persetujuan penggunaan data terlebih dulu.");
        setGalatLokal(null);
        onKirim({
          nomorInduk: String(f.get("nomorInduk") ?? "").trim(),
          nama: String(f.get("nama") ?? "").trim(),
          unit: String(f.get("unit") ?? "").trim(),
          noWa: String(f.get("noWa") ?? "").trim(),
          pin,
          setuju,
        });
      }}
    >
      <div className="flex flex-col gap-1">
        <p className="huruf-judul text-xl leading-tight">Kartu belum terdaftar</p>
        <p className="text-sm font-medium text-muted-foreground">
          {saran?.dariImpor
            ? "Data Anda sudah didaftarkan pengelola. Periksa, lengkapi, lalu buat PIN."
            : "Daftar sekali saja. Setelah itu cukup scan kartu untuk meminjam."}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nomorInduk">Nomor ID</Label>
          <Input
            id="nomorInduk"
            name="nomorInduk"
            defaultValue={saran?.nomorInduk ?? ""}
            readOnly={Boolean(saran?.dariImpor)}
            required
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nama">Nama lengkap</Label>
          <Input id="nama" name="nama" defaultValue={saran?.nama ?? ""} required autoComplete="off" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="unit">Unit / divisi</Label>
          <Input id="unit" name="unit" defaultValue={saran?.unit ?? ""} placeholder="Opsional" autoComplete="off" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="noWa">No. WhatsApp</Label>
          <Input id="noWa" name="noWa" inputMode="tel" placeholder="08xxxxxxxxxx" required autoComplete="off" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pin">Buat PIN (4–6 angka)</Label>
          <Input id="pin" name="pin" type="password" inputMode="numeric" maxLength={6} required autoComplete="new-password" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pinUlang">Ulangi PIN</Label>
          <Input
            id="pinUlang"
            name="pinUlang"
            type="password"
            inputMode="numeric"
            maxLength={6}
            required
            autoComplete="new-password"
          />
        </div>
      </div>
      <p className="text-xs font-medium text-muted-foreground">PIN dipakai saat Anda membuka loker yang sedang dipinjam.</p>
      <div className="flex items-start gap-2.5 rounded-md bg-muted p-3">
        <Checkbox id="setuju" checked={setuju} onCheckedChange={(v) => setSetuju(v === true)} className="mt-0.5" />
        <Label htmlFor="setuju" className="text-sm leading-snug font-medium">
          Saya setuju data saya (nomor ID, nama, unit, no. WhatsApp) dipakai untuk mencatat peminjaman loker.
        </Label>
      </div>
      {(galatLokal || galat) && (
        <p role="alert" className="rounded-md border-2 border-tinta bg-magenta px-3 py-2 text-sm font-semibold text-tinta">
          {galatLokal || galat}
        </p>
      )}
      <div className="flex gap-2.5 pt-1">
        <Button type="submit" size="lg" className="flex-1" disabled={sibuk}>
          {sibuk && <LoaderCircleIcon className="animate-spin" aria-hidden />}
          Daftar & lanjut
        </Button>
        <Button type="button" size="lg" variant="outline" onClick={onBatal}>
          Batal
        </Button>
      </div>
    </form>
  );
}
