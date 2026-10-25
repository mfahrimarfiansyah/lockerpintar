import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { buatLokasiUji, buatPeminjamUji, kodeGalat, kosongkanDb } from "../../tests/bantu";
import { pindaiKartu } from "./pindai";
import { aturPinBaru, resetPin, verifikasiPin } from "./pin";
import { daftarkanPeminjam, type InputRegistrasi } from "./registrasi";

beforeEach(kosongkanDb);

describe("PIN", () => {
  it("terkunci setelah 5 kali salah, lalu bisa dipakai lagi setelah waktunya habis", async () => {
    const mhs = await buatPeminjamUji({ pin: "1234" });
    const coba = (pin: string, sekarang?: Date) =>
      kodeGalat(verifikasiPin({ peminjamId: mhs.id, pin, penggunaId: null, lokasiId: null }, sekarang));
    for (let i = 0; i < 4; i++) expect(await coba("0000")).toBe("PIN_SALAH");
    expect(await coba("0000")).toBe("PIN_TERKUNCI");
    expect(await coba("1234")).toBe("PIN_TERKUNCI");
    expect(await coba("1234", new Date(Date.now() + 6 * 60_000))).toBeNull();
    expect(await prisma.logAktivitas.count({ where: { jenis: "PIN_SALAH" } })).toBe(4);
    expect(await prisma.logAktivitas.count({ where: { jenis: "PIN_TERKUNCI" } })).toBe(1);
  });

  it("PIN benar mengosongkan hitungan salah", async () => {
    const mhs = await buatPeminjamUji({ pin: "1234" });
    const dasar = { peminjamId: mhs.id, penggunaId: null, lokasiId: null };
    expect(await kodeGalat(verifikasiPin({ ...dasar, pin: "9999" }))).toBe("PIN_SALAH");
    expect(await kodeGalat(verifikasiPin({ ...dasar, pin: "1234" }))).toBeNull();
    expect((await prisma.peminjam.findUniqueOrThrow({ where: { id: mhs.id } })).pinSalah).toBe(0);
  });

  it("reset oleh petugas, lalu anggota membuat PIN baru", async () => {
    const mhs = await buatPeminjamUji({ pin: "1234" });
    const petugas = await prisma.pengguna.create({ data: { nama: "Petugas", email: "p@uji.local", peran: "PETUGAS" } });
    const dasar = { peminjamId: mhs.id, penggunaId: null, lokasiId: null };
    expect(await kodeGalat(aturPinBaru({ ...dasar, pin: "5678" }))).toBe("PIN_SUDAH_ADA");
    await resetPin({ peminjamId: mhs.id, penggunaId: petugas.id });
    expect(await kodeGalat(verifikasiPin({ ...dasar, pin: "1234" }))).toBe("PERLU_BUAT_PIN");
    await aturPinBaru({ ...dasar, pin: "5678" });
    expect(await kodeGalat(verifikasiPin({ ...dasar, pin: "5678" }))).toBeNull();
  });
});

describe("registrasi", () => {
  const dasar = (kodeKartu: string, nomorInduk: string): InputRegistrasi & {
    sumber: "KIOSK";
    penggunaId: null;
    lokasiId: null;
  } => ({
    kodeKartu,
    nomorInduk,
    nama: "Dewi Lestari",
    unit: "Keuangan",
    noWa: "0812 3456 7890",
    pin: "4321",
    setuju: true,
    sumber: "KIOSK",
    penggunaId: null,
    lokasiId: null,
  });

  it("mendaftarkan kartu baru dengan data yang dinormalkan", async () => {
    const { peminjamId } = await daftarkanPeminjam(dasar(" kartu-baru-1 ", "2024000001"));
    const p = await prisma.peminjam.findUniqueOrThrow({ where: { id: peminjamId } });
    expect(p.kodeKartu).toBe("KARTU-BARU-1");
    expect(p.noWa).toBe("6281234567890");
    expect(p.pinHash).toBeTruthy();
    expect(p.setujuDataAt).toBeTruthy();
  });

  it("menautkan kartu ke nomor ID hasil impor", async () => {
    const impor = await prisma.peminjam.create({ data: { nomorInduk: "2024000002", nama: "Dari Impor", sumber: "IMPOR" } });
    const hasil = await daftarkanPeminjam(dasar("2024000002", "2024000002"));
    expect(hasil).toEqual({ peminjamId: impor.id, tautImpor: true });
    const p = await prisma.peminjam.findUniqueOrThrow({ where: { id: impor.id } });
    expect(p.kodeKartu).toBe("2024000002");
    expect(p.sumber).toBe("IMPOR");
  });

  it("menolak nomor ID yang sudah terhubung ke kartu lain, kartu ganda, & tanpa persetujuan", async () => {
    await daftarkanPeminjam(dasar("KARTU-A", "2024000003"));
    expect(await kodeGalat(daftarkanPeminjam(dasar("KARTU-B", "2024000003")))).toBe("NOMOR_TERHUBUNG_KARTU_LAIN");
    expect(await kodeGalat(daftarkanPeminjam(dasar("KARTU-A", "2024000004")))).toBe("KARTU_SUDAH_TERDAFTAR");
    expect(
      await kodeGalat(daftarkanPeminjam({ ...dasar("KARTU-C", "2024000005"), setuju: false as unknown as true })),
    ).toBe("DATA_TIDAK_VALID");
    expect(await kodeGalat(daftarkanPeminjam({ ...dasar("KARTU-D", "2024000006"), noWa: "12" }))).toBe(
      "DATA_TIDAK_VALID",
    );
  });
});

describe("pindaiKartu", () => {
  it("kartu tak dikenal berisi nomor ID hasil impor memberi saran data", async () => {
    const { lokasi } = await buatLokasiUji();
    await prisma.peminjam.create({
      data: { nomorInduk: "1000031", nama: "Nur Aisyah", unit: "Umum", sumber: "IMPOR" },
    });
    const hasil = await pindaiKartu({ kodeKartu: "1000031", lokasiId: lokasi.id, penggunaId: null });
    expect(hasil).toMatchObject({
      jenis: "TIDAK_DIKENAL",
      saran: { nomorInduk: "1000031", nama: "Nur Aisyah", unit: "Umum", dariImpor: true },
    });
  });

  it("kartu diblokir ditolak dan dicatat", async () => {
    const { lokasi } = await buatLokasiUji();
    const mhs = await buatPeminjamUji({ status: "DIBLOKIR", alasanBlokir: "Uji" });
    const hasil = await pindaiKartu({ kodeKartu: mhs.kodeKartu!, lokasiId: lokasi.id, penggunaId: null });
    expect(hasil).toMatchObject({ jenis: "DIBLOKIR", alasan: "Uji" });
    expect(await prisma.logAktivitas.count({ where: { jenis: "DITOLAK", peminjamId: mhs.id } })).toBe(1);
  });

  it("peminjam hasil impor tanpa PIN diminta membuat PIN", async () => {
    const { lokasi } = await buatLokasiUji();
    const mhs = await buatPeminjamUji({ pin: null });
    const hasil = await pindaiKartu({ kodeKartu: mhs.kodeKartu!.toLowerCase(), lokasiId: lokasi.id, penggunaId: null });
    expect(hasil).toMatchObject({ jenis: "DIKENAL", perluBuatPin: true, bolehPinjamLagi: true, pinjamanAktif: [] });
  });
});
