"use server";

import { refresh } from "next/cache";
import type { KondisiLoker } from "@/generated/prisma/enums";
import { aturGagalBerikutnya } from "@/kunci";
import { buatLokerMassal, simpanLokasi, ubahKondisiLoker, type InputLokasi } from "@/domain/lokasi";
import { simpanPengaturan, type NilaiPengaturan } from "@/domain/pengaturan";
import {
  aturAktifPengguna,
  buatPengguna,
  gantiPasswordPengguna,
  type InputPengguna,
} from "@/domain/pengguna";
import { GalatDomain } from "@/domain/galat";
import { catatLog } from "@/domain/log";
import { penggunaUntukAksi } from "@/lib/sesi";
import { bungkus, type Hasil } from "./hasil";

const admin = () => penggunaUntukAksi("ADMIN");

export async function aksiSimpanLokasi(input: InputLokasi & { id: string | null }): Promise<Hasil<string>> {
  return bungkus(async () => {
    const p = await admin();
    const { id, ...data } = input;
    const lokasi = await simpanLokasi(id, data, p.id);
    refresh();
    return lokasi.id;
  });
}

export async function aksiBuatLokerMassal(input: {
  lokasiId: string;
  blok: string;
  baris: number;
  kolom: number;
  ukuran?: string;
}): Promise<Hasil<string>> {
  return bungkus(async () => {
    const p = await admin();
    const { lokasiId, ...data } = input;
    const jumlah = await buatLokerMassal(lokasiId, data, p.id);
    refresh();
    return `${jumlah} loker ditambahkan.`;
  });
}

const KONDISI: KondisiLoker[] = ["NORMAL", "PERBAIKAN", "NONAKTIF"];

export async function aksiUbahKondisiLoker(input: { lokerId: string; kondisi: KondisiLoker }): Promise<Hasil<string>> {
  return bungkus(async () => {
    const p = await admin();
    if (!KONDISI.includes(input.kondisi)) throw new GalatDomain("DATA_TIDAK_VALID", "Kondisi tidak dikenal.");
    const loker = await ubahKondisiLoker(input.lokerId, input.kondisi, p.id);
    refresh();
    return `Loker ${loker.kode} diperbarui.`;
  });
}

export async function aksiBuatPengguna(input: InputPengguna): Promise<Hasil<string>> {
  return bungkus(async () => {
    const p = await admin();
    const baru = await buatPengguna(input, p.id);
    refresh();
    return `Akun ${baru.email} dibuat.`;
  });
}

export async function aksiAturAktifPengguna(input: { id: string; aktif: boolean }): Promise<Hasil<string>> {
  return bungkus(async () => {
    const p = await admin();
    await aturAktifPengguna(input.id, input.aktif, p.id);
    refresh();
    return input.aktif ? "Akun diaktifkan." : "Akun dinonaktifkan dan sesinya diakhiri.";
  });
}

export async function aksiGantiPasswordPengguna(input: { id: string; password: string }): Promise<Hasil<string>> {
  return bungkus(async () => {
    const p = await admin();
    await gantiPasswordPengguna(input.id, input.password, p.id);
    refresh();
    return "Password diganti. Perangkat/akun tersebut perlu login ulang.";
  });
}

export async function aksiSimpanPengaturan(input: NilaiPengaturan): Promise<Hasil<string>> {
  return bungkus(async () => {
    const p = await admin();
    await simpanPengaturan(input, p.id);
    refresh();
    return "Pengaturan disimpan.";
  });
}

export async function aksiAturGagalSimulasi(input: { lokasiId: string; aktif: boolean }): Promise<Hasil<string>> {
  return bungkus(async () => {
    const p = await admin();
    aturGagalBerikutnya(input.lokasiId, input.aktif);
    await catatLog({
      jenis: "UBAH_DATA",
      penggunaId: p.id,
      lokasiId: input.lokasiId,
      detail: { objek: "simulator", gagalBerikutnya: input.aktif },
    });
    refresh();
    return input.aktif ? "Pembukaan berikutnya di lokasi ini akan gagal." : "Simulasi gagal dibatalkan.";
  });
}
