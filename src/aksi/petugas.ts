"use server";

import { refresh } from "next/cache";
import { GalatDomain } from "@/domain/galat";
import { paksaBuka, paksaSelesai } from "@/domain/peminjaman";
import {
  blokirPeminjam,
  bukaBlokirPeminjam,
  gantiKartu,
  imporPeminjam,
  ubahDataPeminjam,
  type HasilImpor,
} from "@/domain/peminjam-admin";
import { bacaFileImpor } from "@/domain/impor";
import { resetPin } from "@/domain/pin";
import { prisma } from "@/lib/db";
import { GalatAkses, penggunaUntukAksi, type PenggunaSesi } from "@/lib/sesi";
import { bungkus, type Hasil } from "./hasil";

async function petugas() {
  return penggunaUntukAksi("PETUGAS", "ADMIN");
}

/** Petugas yang terikat lokasi hanya boleh menangani peminjaman di lokasinya. */
async function pastikanLokasiPeminjaman(pengguna: PenggunaSesi, peminjamanId: string) {
  if (pengguna.peran !== "PETUGAS" || !pengguna.lokasiId) return;
  const p = await prisma.peminjaman.findUnique({
    where: { id: peminjamanId },
    select: { loker: { select: { lokasiId: true } } },
  });
  if (p && p.loker.lokasiId !== pengguna.lokasiId) throw new GalatAkses("Peminjaman ini bukan di lokasi Anda.");
}

export async function aksiPaksaBuka(input: { peminjamanId: string; alasan: string }): Promise<Hasil<string>> {
  return bungkus(async () => {
    const pengguna = await petugas();
    await pastikanLokasiPeminjaman(pengguna, input.peminjamanId);
    const hasil = await paksaBuka({ ...input, penggunaId: pengguna.id });
    refresh();
    return hasil.pesanBuka;
  });
}

export async function aksiPaksaSelesai(input: { peminjamanId: string; alasan: string }): Promise<Hasil<string>> {
  return bungkus(async () => {
    const pengguna = await petugas();
    await pastikanLokasiPeminjaman(pengguna, input.peminjamanId);
    const hasil = await paksaSelesai({ ...input, penggunaId: pengguna.id });
    refresh();
    return `Peminjaman loker ${hasil.lokerKode} diakhiri.`;
  });
}

export async function aksiResetPin(input: { peminjamId: string }): Promise<Hasil<string>> {
  return bungkus(async () => {
    const pengguna = await petugas();
    await resetPin({ peminjamId: input.peminjamId, penggunaId: pengguna.id });
    refresh();
    return "PIN direset. Anggota membuat PIN baru saat scan berikutnya.";
  });
}

export async function aksiGantiKartu(input: { peminjamId: string; kodeKartu: string }): Promise<Hasil<string>> {
  return bungkus(async () => {
    const pengguna = await petugas();
    await gantiKartu(input.peminjamId, input.kodeKartu, pengguna.id);
    refresh();
    return "Kartu berhasil diganti.";
  });
}

export async function aksiUbahAnggota(input: {
  peminjamId: string;
  nama: string;
  unit?: string;
  noWa?: string;
}): Promise<Hasil<string>> {
  return bungkus(async () => {
    const pengguna = await petugas();
    await ubahDataPeminjam(input.peminjamId, input, pengguna.id);
    refresh();
    return "Data anggota disimpan.";
  });
}

export async function aksiBlokir(input: { peminjamId: string; alasan: string }): Promise<Hasil<string>> {
  return bungkus(async () => {
    const pengguna = await petugas();
    await blokirPeminjam(input.peminjamId, input.alasan, pengguna.id);
    refresh();
    return "Anggota diblokir.";
  });
}

export async function aksiBukaBlokir(input: { peminjamId: string }): Promise<Hasil<string>> {
  return bungkus(async () => {
    const pengguna = await petugas();
    await bukaBlokirPeminjam(input.peminjamId, pengguna.id);
    refresh();
    return "Blokir dibuka.";
  });
}

const MAKS_UKURAN_IMPOR = 900 * 1024;

export async function aksiImporAnggota(formData: FormData): Promise<Hasil<HasilImpor>> {
  return bungkus(async () => {
    const pengguna = await petugas();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new GalatDomain("DATA_TIDAK_VALID", "Pilih file .csv atau .xlsx.");
    if (file.size > MAKS_UKURAN_IMPOR) throw new GalatDomain("DATA_TIDAK_VALID", "Ukuran file maksimal 900 KB.");
    const baris = await bacaFileImpor(file.name, await file.arrayBuffer());
    const hasil = await imporPeminjam(baris, pengguna.id);
    refresh();
    return hasil;
  });
}
