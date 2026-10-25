import { prisma } from "@/lib/db";
import { cocokPin, hashPin, pinValid } from "@/lib/hash-pin";
import { GalatDomain } from "./galat";
import { catatLog } from "./log";
import { ambilPengaturan } from "./pengaturan";

type InputPin = { peminjamId: string; pin: string; penggunaId: string | null; lokasiId: string | null };

function sisaMenit(sampai: Date, sekarang: Date) {
  return Math.max(1, Math.ceil((sampai.getTime() - sekarang.getTime()) / 60_000));
}

export async function verifikasiPin(input: InputPin, sekarang = new Date()): Promise<void> {
  const peminjam = await prisma.peminjam.findUnique({ where: { id: input.peminjamId } });
  if (!peminjam) throw new GalatDomain("TIDAK_DITEMUKAN", "Data anggota tidak ditemukan.");
  if (peminjam.status === "DIBLOKIR") throw new GalatDomain("DIBLOKIR", "Akun Anda diblokir. Silakan hubungi petugas.");
  if (!peminjam.pinHash) throw new GalatDomain("PERLU_BUAT_PIN", "Anda belum membuat PIN.");
  if (peminjam.pinTerkunciSampai && peminjam.pinTerkunciSampai > sekarang) {
    throw new GalatDomain(
      "PIN_TERKUNCI",
      `PIN terkunci. Coba lagi dalam ${sisaMenit(peminjam.pinTerkunciSampai, sekarang)} menit atau hubungi petugas.`,
      { sampai: peminjam.pinTerkunciSampai.toISOString() },
    );
  }

  if (pinValid(input.pin) && (await cocokPin(input.pin, peminjam.pinHash))) {
    if (peminjam.pinSalah > 0 || peminjam.pinTerkunciSampai) {
      await prisma.peminjam.update({
        where: { id: peminjam.id },
        data: { pinSalah: 0, pinTerkunciSampai: null },
      });
    }
    return;
  }

  const pengaturan = await ambilPengaturan();
  const { pinSalah } = await prisma.peminjam.update({
    where: { id: peminjam.id },
    data: { pinSalah: { increment: 1 } },
    select: { pinSalah: true },
  });
  const dasarLog = { penggunaId: input.penggunaId, peminjamId: peminjam.id, lokasiId: input.lokasiId };

  if (pinSalah >= pengaturan.maksSalahPin) {
    const sampai = new Date(sekarang.getTime() + pengaturan.lamaKunciPinMenit * 60_000);
    await prisma.peminjam.update({
      where: { id: peminjam.id },
      data: { pinSalah: 0, pinTerkunciSampai: sampai },
    });
    await catatLog({ jenis: "PIN_TERKUNCI", ...dasarLog, detail: { sampai: sampai.toISOString() } });
    throw new GalatDomain(
      "PIN_TERKUNCI",
      `PIN salah ${pengaturan.maksSalahPin} kali. PIN terkunci ${pengaturan.lamaKunciPinMenit} menit; hubungi petugas bila perlu.`,
      { sampai: sampai.toISOString() },
    );
  }

  await catatLog({ jenis: "PIN_SALAH", ...dasarLog, detail: { percobaan: pinSalah } });
  const sisa = pengaturan.maksSalahPin - pinSalah;
  throw new GalatDomain("PIN_SALAH", `PIN salah. Sisa ${sisa} percobaan.`, { sisa });
}

/** Untuk anggota hasil impor atau yang PIN-nya direset petugas. */
export async function aturPinBaru(input: InputPin): Promise<void> {
  if (!pinValid(input.pin)) throw new GalatDomain("DATA_TIDAK_VALID", "PIN harus 4–6 angka.");
  const peminjam = await prisma.peminjam.findUnique({ where: { id: input.peminjamId } });
  if (!peminjam) throw new GalatDomain("TIDAK_DITEMUKAN", "Data anggota tidak ditemukan.");
  if (peminjam.status === "DIBLOKIR") throw new GalatDomain("DIBLOKIR", "Akun Anda diblokir. Silakan hubungi petugas.");
  if (peminjam.pinHash) throw new GalatDomain("PIN_SUDAH_ADA", "PIN sudah pernah dibuat.");
  await prisma.peminjam.update({
    where: { id: peminjam.id },
    data: { pinHash: await hashPin(input.pin), pinSalah: 0, pinTerkunciSampai: null },
  });
  await catatLog({
    jenis: "REGISTRASI",
    penggunaId: input.penggunaId,
    peminjamId: peminjam.id,
    lokasiId: input.lokasiId,
    detail: { aksi: "BUAT_PIN" },
  });
}

/** Petugas: PIN dihapus; anggota membuat PIN baru saat scan berikutnya. */
export async function resetPin(input: { peminjamId: string; penggunaId: string }): Promise<void> {
  await prisma.peminjam.update({
    where: { id: input.peminjamId },
    data: { pinHash: null, pinSalah: 0, pinTerkunciSampai: null },
  });
  await catatLog({ jenis: "RESET_PIN", penggunaId: input.penggunaId, peminjamId: input.peminjamId });
}
