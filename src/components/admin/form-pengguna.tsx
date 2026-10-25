"use client";

import { useState } from "react";
import { aksiAturAktifPengguna, aksiBuatPengguna, aksiGantiPasswordPengguna, aksiSimpanPengaturan } from "@/aksi/admin";
import type { NilaiPengaturan } from "@/domain/pengaturan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogIsian, useAksi } from "./aksi-ui";
import { KELAS_SELECT } from "./form-lokasi";

type Peran = "ADMIN" | "PETUGAS" | "KIOSK";

export function FormPengguna({ lokasi }: { lokasi: { id: string; nama: string }[] }) {
  const { sibuk, jalankan } = useAksi();
  const [peran, setPeran] = useState<Peran>("PETUGAS");
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        const h = await jalankan(() =>
          aksiBuatPengguna({
            nama: String(f.get("nama") ?? ""),
            email: String(f.get("email") ?? ""),
            password: String(f.get("password") ?? ""),
            peran,
            lokasiId: String(f.get("lokasiId") ?? ""),
          }),
        );
        if (h?.ok) {
          form.reset();
          setPeran("PETUGAS");
        }
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pengguna-peran">Peran</Label>
        <select
          id="pengguna-peran"
          className={KELAS_SELECT}
          value={peran}
          onChange={(e) => setPeran(e.target.value as Peran)}
        >
          <option value="PETUGAS">Petugas</option>
          <option value="KIOSK">Kiosk (tablet di lokasi)</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pengguna-nama">Nama</Label>
        <Input id="pengguna-nama" name="nama" required placeholder={peran === "KIOSK" ? "Kiosk Gedung A" : "Nama lengkap"} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pengguna-email">Email (untuk login)</Label>
        <Input id="pengguna-email" name="email" type="email" required autoComplete="off" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pengguna-password">Password awal</Label>
        <Input id="pengguna-password" name="password" type="password" minLength={8} required autoComplete="new-password" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pengguna-lokasi">
          Lokasi {peran === "KIOSK" ? "(wajib)" : peran === "PETUGAS" ? "(kosongkan bila bertugas di semua lokasi)" : "(tidak perlu)"}
        </Label>
        <select
          id="pengguna-lokasi"
          name="lokasiId"
          className={KELAS_SELECT}
          required={peran === "KIOSK"}
          disabled={peran === "ADMIN"}
          defaultValue=""
        >
          <option value="">—</option>
          {lokasi.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nama}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Button type="submit" disabled={sibuk}>
          Buat akun
        </Button>
      </div>
    </form>
  );
}

export function AksiPengguna({ id, aktif, diriSendiri }: { id: string; aktif: boolean; diriSendiri: boolean }) {
  const { sibuk, jalankan } = useAksi();
  return (
    <div className="flex justify-end gap-1">
      <DialogIsian
        pemicu={
          <Button size="xs" variant="outline">
            Ganti password
          </Button>
        }
        judul="Ganti password"
        deskripsi="Semua sesi akun ini diakhiri; perangkat perlu login ulang."
        label="Password baru (minimal 8 karakter)"
        tipe="password"
        minimal={8}
        onKirim={async (password) => (await jalankan(() => aksiGantiPasswordPengguna({ id, password })))?.ok ?? false}
      />
      {!diriSendiri && (
        <Button
          size="xs"
          variant={aktif ? "destructive" : "outline"}
          disabled={sibuk}
          onClick={() => jalankan(() => aksiAturAktifPengguna({ id, aktif: !aktif }))}
        >
          {aktif ? "Nonaktifkan" : "Aktifkan"}
        </Button>
      )}
    </div>
  );
}

const ISIAN_PENGATURAN: { kunci: keyof NilaiPengaturan; label: string; bantuan: string; min: number; max: number }[] = [
  { kunci: "maksPinjamPerOrang", label: "Maksimal loker per anggota", bantuan: "Jumlah loker aktif yang boleh dipegang sekaligus.", min: 1, max: 10 },
  { kunci: "maksSalahPin", label: "Batas salah PIN", bantuan: "Setelah salah sebanyak ini, PIN dikunci sementara.", min: 3, max: 20 },
  { kunci: "lamaKunciPinMenit", label: "Lama PIN terkunci (menit)", bantuan: "Petugas tetap bisa mereset PIN kapan saja.", min: 1, max: 1440 },
  { kunci: "resetKioskDetik", label: "Kiosk kembali ke awal (detik)", bantuan: "Jeda setelah layar berhasil/gagal ditampilkan.", min: 3, max: 120 },
];

export function FormPengaturan({ awal }: { awal: NilaiPengaturan }) {
  const { sibuk, jalankan } = useAksi();
  return (
    <form
      className="flex max-w-xl flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const nilai = Object.fromEntries(ISIAN_PENGATURAN.map((i) => [i.kunci, Number(f.get(i.kunci))])) as NilaiPengaturan;
        void jalankan(() => aksiSimpanPengaturan(nilai));
      }}
    >
      {ISIAN_PENGATURAN.map((i) => (
        <div key={i.kunci} className="flex flex-col gap-1.5">
          <Label htmlFor={`atur-${i.kunci}`}>{i.label}</Label>
          <Input
            id={`atur-${i.kunci}`}
            name={i.kunci}
            type="number"
            min={i.min}
            max={i.max}
            defaultValue={awal[i.kunci]}
            required
            className="w-32"
          />
          <p className="text-xs text-muted-foreground">{i.bantuan}</p>
        </div>
      ))}
      <div>
        <Button type="submit" disabled={sibuk}>
          Simpan pengaturan
        </Button>
      </div>
    </form>
  );
}
