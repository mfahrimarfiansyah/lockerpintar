"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { aksiPaksaBuka, aksiPaksaSelesai } from "@/aksi/petugas";
import {
  aksiBlokir,
  aksiBukaBlokir,
  aksiGantiKartu,
  aksiImporAnggota,
  aksiResetPin,
  aksiUbahAnggota,
} from "@/aksi/petugas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogIsian, useAksi } from "./aksi-ui";

export function TombolPaksaSelesai({ peminjamanId, lokerKode }: { peminjamanId: string; lokerKode: string }) {
  const { jalankan } = useAksi();
  return (
    <DialogIsian
      pemicu={
        <Button size="xs" variant="outline">
          Akhiri
        </Button>
      }
      judul={`Akhiri peminjaman loker ${lokerKode}`}
      deskripsi="Peminjaman diakhiri tanpa scan/PIN anggota. Alasan tercatat di log."
      label="Alasan"
      placeholder="mis. kartu hilang, barang sudah diambil petugas"
      labelKirim="Akhiri peminjaman"
      destruktif
      onKirim={async (alasan) => (await jalankan(() => aksiPaksaSelesai({ peminjamanId, alasan })))?.ok ?? false}
    />
  );
}

export function TombolPaksaBuka({ peminjamanId, lokerKode }: { peminjamanId: string; lokerKode: string }) {
  const { jalankan } = useAksi();
  return (
    <DialogIsian
      pemicu={
        <Button size="xs" variant="outline">
          Buka
        </Button>
      }
      judul={`Paksa buka loker ${lokerKode}`}
      deskripsi="Pintu dibuka tanpa PIN anggota. Pastikan identitas sudah diperiksa."
      label="Alasan"
      placeholder="mis. lupa PIN, identitas sudah dicek"
      labelKirim="Buka loker"
      onKirim={async (alasan) => (await jalankan(() => aksiPaksaBuka({ peminjamanId, alasan })))?.ok ?? false}
    />
  );
}

export function AksiAnggota({ peminjamId, diblokir }: { peminjamId: string; diblokir: boolean }) {
  const { sibuk, jalankan } = useAksi();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={sibuk}
        onClick={() => jalankan(() => aksiResetPin({ peminjamId }))}
      >
        Reset PIN
      </Button>
      <DialogIsian
        pemicu={
          <Button size="sm" variant="outline">
            Ganti kartu
          </Button>
        }
        judul="Ganti kartu"
        deskripsi="Scan kartu baru ke kolom di bawah. Kartu lama tidak berlaku lagi."
        label="Kode kartu baru"
        placeholder="Scan kartu baru di sini"
        onKirim={async (kodeKartu) => (await jalankan(() => aksiGantiKartu({ peminjamId, kodeKartu })))?.ok ?? false}
      />
      {diblokir ? (
        <Button size="sm" variant="outline" disabled={sibuk} onClick={() => jalankan(() => aksiBukaBlokir({ peminjamId }))}>
          Buka blokir
        </Button>
      ) : (
        <DialogIsian
          pemicu={
            <Button size="sm" variant="destructive">
              Blokir
            </Button>
          }
          judul="Blokir anggota"
          deskripsi="Anggota yang diblokir tidak bisa meminjam loker sampai blokir dibuka."
          label="Alasan"
          labelKirim="Blokir"
          destruktif
          onKirim={async (alasan) => (await jalankan(() => aksiBlokir({ peminjamId, alasan })))?.ok ?? false}
        />
      )}
    </div>
  );
}

export function FormUbahAnggota({
  peminjam,
}: {
  peminjam: { id: string; nama: string; unit: string | null; noWa: string | null };
}) {
  const { sibuk, jalankan } = useAksi();
  return (
    <form
      className="grid gap-3 sm:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        void jalankan(() =>
          aksiUbahAnggota({
            peminjamId: peminjam.id,
            nama: String(f.get("nama") ?? ""),
            unit: String(f.get("unit") ?? ""),
            noWa: String(f.get("noWa") ?? ""),
          }),
        );
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ubah-nama">Nama</Label>
        <Input id="ubah-nama" name="nama" defaultValue={peminjam.nama} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ubah-unit">Unit / divisi</Label>
        <Input id="ubah-unit" name="unit" defaultValue={peminjam.unit ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ubah-wa">No. WhatsApp</Label>
        <Input id="ubah-wa" name="noWa" defaultValue={peminjam.noWa ?? ""} inputMode="tel" />
      </div>
      <div className="sm:col-span-3">
        <Button type="submit" disabled={sibuk}>
          Simpan data
        </Button>
      </div>
    </form>
  );
}

export function FormImporAnggota() {
  const { sibuk, jalankan } = useAksi();
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [ringkasan, setRingkasan] = useState<string | null>(null);
  return (
    <form
      ref={ref}
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const h = await jalankan(
          () => aksiImporAnggota(new FormData(e.currentTarget)),
          (d) => `Impor selesai: ${d.dibuat} baru, ${d.diperbarui} diperbarui.`,
        );
        if (h?.ok) {
          const lewat = h.data.dilewati;
          setRingkasan(
            lewat.length
              ? `${lewat.length} baris dilewati: ${lewat
                  .slice(0, 5)
                  .map((l) => `baris ${l.baris} (${l.alasan})`)
                  .join(", ")}${lewat.length > 5 ? ", …" : ""}`
              : null,
          );
          ref.current?.reset();
          router.refresh();
        }
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="file-impor">File CSV atau Excel (.xlsx)</Label>
        <Input id="file-impor" name="file" type="file" accept=".csv,.xlsx" required />
        <p className="text-xs text-muted-foreground">
          Baris pertama berisi judul kolom: <code>nomor</code>, <code>nama</code>, <code>unit</code>, <code>no_wa</code>.
          Kartu & PIN ditautkan saat anggota pertama kali scan kartunya.
        </p>
      </div>
      {ringkasan && <p className="text-sm text-amber-700">{ringkasan}</p>}
      <div>
        <Button type="submit" disabled={sibuk}>
          Impor data
        </Button>
      </div>
    </form>
  );
}
