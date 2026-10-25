import { beforeEach, describe, expect, it } from "vitest";
import { aturGagalBerikutnya } from "@/kunci";
import { prisma } from "@/lib/db";
import { buatLokasiUji, buatPeminjamUji, kodeGalat, kosongkanDb } from "../../tests/bantu";
import type { GalatDomain } from "./galat";
import { statusLokerLokasi } from "./ketersediaan";
import { bukaUlang, kembalikanLoker, paksaSelesai, pinjamLoker } from "./peminjaman";
import { statusPeminjamDiLokasi } from "./pindai";

beforeEach(kosongkanDb);

describe("pinjamLoker", () => {
  it("meminjam loker pilihan, tercatat, lalu dikembalikan", async () => {
    const { lokasi, loker } = await buatLokasiUji();
    const mhs = await buatPeminjamUji();
    const hasil = await pinjamLoker({ peminjamId: mhs.id, lokasiId: lokasi.id, lokerId: loker[1].id, penggunaId: null });
    expect(hasil.lokerKode).toBe("A-02");
    expect(hasil.pesanBuka).toBe("Loker A-02 terbuka");
    expect((await statusLokerLokasi(lokasi.id)).find((l) => l.kode === "A-02")?.status).toBe("DIPAKAI");

    const kembali = await kembalikanLoker({
      peminjamId: mhs.id,
      peminjamanId: hasil.peminjamanId,
      lokasiId: lokasi.id,
      penggunaId: null,
      pinTerverifikasi: true,
    });
    expect(kembali.terlambat).toBe(false);
    expect((await statusLokerLokasi(lokasi.id)).find((l) => l.kode === "A-02")?.status).toBe("KOSONG");
    const log = await prisma.logAktivitas.findMany({ where: { peminjamId: mhs.id }, orderBy: { waktu: "asc" } });
    expect(log.map((l) => l.jenis)).toEqual(["PINJAM", "KEMBALI"]);
  });

  it("memilih loker kosong pertama secara otomatis", async () => {
    const { lokasi, loker } = await buatLokasiUji();
    const [a, b] = await Promise.all([buatPeminjamUji(), buatPeminjamUji()]);
    await pinjamLoker({ peminjamId: a.id, lokasiId: lokasi.id, lokerId: loker[0].id, penggunaId: null });
    const hasil = await pinjamLoker({ peminjamId: b.id, lokasiId: lokasi.id, lokerId: null, penggunaId: null });
    expect(hasil.lokerKode).toBe("A-02");
  });

  it("menolak pinjaman kedua bila maksimal 1 loker", async () => {
    const { lokasi, loker } = await buatLokasiUji();
    const mhs = await buatPeminjamUji();
    await pinjamLoker({ peminjamId: mhs.id, lokasiId: lokasi.id, lokerId: loker[0].id, penggunaId: null });
    expect(
      await kodeGalat(pinjamLoker({ peminjamId: mhs.id, lokasiId: lokasi.id, lokerId: loker[1].id, penggunaId: null })),
    ).toBe("BATAS_PINJAM");
  });

  it("menolak peminjaman di luar jam buka", async () => {
    const { lokasi, loker } = await buatLokasiUji({ jamBuka: "07:00", jamTutup: "17:00" });
    const mhs = await buatPeminjamUji();
    const malam = new Date("2026-10-24T12:00:00Z"); // 20.00 WITA
    expect(
      await kodeGalat(
        pinjamLoker({ peminjamId: mhs.id, lokasiId: lokasi.id, lokerId: loker[0].id, penggunaId: null }, malam),
      ),
    ).toBe("DI_LUAR_JAM_BUKA");
  });

  it("dari 8 orang yang berebut loker yang sama, hanya satu yang berhasil", async () => {
    const { lokasi, loker } = await buatLokasiUji();
    const semua = await Promise.all(Array.from({ length: 8 }, () => buatPeminjamUji()));
    const hasil = await Promise.allSettled(
      semua.map((m) => pinjamLoker({ peminjamId: m.id, lokasiId: lokasi.id, lokerId: loker[0].id, penggunaId: null })),
    );
    expect(hasil.filter((h) => h.status === "fulfilled")).toHaveLength(1);
    for (const h of hasil) {
      if (h.status === "rejected") expect((h.reason as GalatDomain).kode).toBe("LOKER_TIDAK_TERSEDIA");
    }
    expect(await prisma.peminjaman.count({ where: { lokerId: loker[0].id, selesaiAt: null } })).toBe(1);
  });

  it("satu orang di dua kiosk sekaligus tetap hanya mendapat satu loker", async () => {
    const { lokasi, loker } = await buatLokasiUji();
    const mhs = await buatPeminjamUji();
    const hasil = await Promise.allSettled(
      [loker[0], loker[1]].map((l) =>
        pinjamLoker({ peminjamId: mhs.id, lokasiId: lokasi.id, lokerId: l.id, penggunaId: null }),
      ),
    );
    expect(hasil.filter((h) => h.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.peminjaman.count({ where: { peminjamId: mhs.id, selesaiAt: null } })).toBe(1);
  });

  it("pilih otomatis secara paralel memberi loker yang berbeda-beda", async () => {
    const { lokasi } = await buatLokasiUji({ jumlahLoker: 4 });
    const semua = await Promise.all(Array.from({ length: 4 }, () => buatPeminjamUji()));
    const hasil = await Promise.all(
      semua.map((m) => pinjamLoker({ peminjamId: m.id, lokasiId: lokasi.id, lokerId: null, penggunaId: null })),
    );
    expect(new Set(hasil.map((h) => h.lokerKode)).size).toBe(4);
    const tambahan = await buatPeminjamUji();
    expect(
      await kodeGalat(pinjamLoker({ peminjamId: tambahan.id, lokasiId: lokasi.id, lokerId: null, penggunaId: null })),
    ).toBe("LOKER_PENUH");
  });

  it("membatalkan peminjaman bila kunci gagal terbuka", async () => {
    const { lokasi, loker } = await buatLokasiUji();
    const mhs = await buatPeminjamUji();
    aturGagalBerikutnya(lokasi.id, true);
    expect(
      await kodeGalat(pinjamLoker({ peminjamId: mhs.id, lokasiId: lokasi.id, lokerId: loker[0].id, penggunaId: null })),
    ).toBe("KUNCI_GAGAL");
    expect(await prisma.peminjaman.count()).toBe(0);
    expect(await prisma.logAktivitas.count({ where: { jenis: "KUNCI_GAGAL" } })).toBe(1);
  });

  it("peminjam yang terlambat harus mengembalikan dulu", async () => {
    const { lokasi, loker } = await buatLokasiUji();
    const mhs = await buatPeminjamUji();
    const kemarin = new Date(Date.now() - 24 * 3600_000);
    const lama = await prisma.peminjaman.create({
      data: { peminjamId: mhs.id, lokerId: loker[0].id, mulaiAt: kemarin, batasAt: new Date(kemarin.getTime() + 3600_000) },
    });
    const status = await statusPeminjamDiLokasi(mhs.id, lokasi.id);
    expect(status.pinjamanAktif[0]?.terlambat).toBe(true);
    expect(status.bolehPinjamLagi).toBe(false);
    expect((await statusLokerLokasi(lokasi.id))[0]?.status).toBe("TERLAMBAT");
    expect(
      await kodeGalat(pinjamLoker({ peminjamId: mhs.id, lokasiId: lokasi.id, lokerId: loker[1].id, penggunaId: null })),
    ).toBe("BATAS_PINJAM");

    const kembali = await kembalikanLoker({
      peminjamId: mhs.id,
      peminjamanId: lama.id,
      lokasiId: lokasi.id,
      penggunaId: null,
      pinTerverifikasi: true,
    });
    expect(kembali.terlambat).toBe(true);
  });

  it("buka ulang memerlukan PIN bila lokasi mewajibkan, dan harus di lokasi yang sama", async () => {
    const { lokasi, loker } = await buatLokasiUji();
    const { lokasi: lain } = await buatLokasiUji();
    const mhs = await buatPeminjamUji();
    const { peminjamanId } = await pinjamLoker({
      peminjamId: mhs.id,
      lokasiId: lokasi.id,
      lokerId: loker[0].id,
      penggunaId: null,
    });
    const dasar = { peminjamId: mhs.id, peminjamanId, penggunaId: null };
    expect(await kodeGalat(bukaUlang({ ...dasar, lokasiId: lokasi.id, pinTerverifikasi: false }))).toBe("PERLU_PIN");
    expect(await kodeGalat(bukaUlang({ ...dasar, lokasiId: lain.id, pinTerverifikasi: true }))).toBe("BEDA_LOKASI");
    expect(await kodeGalat(bukaUlang({ ...dasar, lokasiId: lokasi.id, pinTerverifikasi: true }))).toBeNull();
    expect(await prisma.logAktivitas.count({ where: { jenis: "BUKA_ULANG" } })).toBe(1);
  });

  it("petugas dapat mengakhiri paksa dengan alasan", async () => {
    const { lokasi, loker } = await buatLokasiUji();
    const mhs = await buatPeminjamUji();
    const { peminjamanId } = await pinjamLoker({
      peminjamId: mhs.id,
      lokasiId: lokasi.id,
      lokerId: loker[0].id,
      penggunaId: null,
    });
    const petugas = await prisma.pengguna.create({ data: { nama: "Petugas", email: "p@uji.local", peran: "PETUGAS" } });
    expect(await kodeGalat(paksaSelesai({ peminjamanId, alasan: " ", penggunaId: petugas.id }))).toBe("DATA_TIDAK_VALID");
    await paksaSelesai({ peminjamanId, alasan: "Kartu hilang", penggunaId: petugas.id });
    const p = await prisma.peminjaman.findUniqueOrThrow({ where: { id: peminjamanId } });
    expect(p.caraSelesai).toBe("PAKSA");
    expect(p.alasanPaksa).toBe("Kartu hilang");
    expect(await kodeGalat(paksaSelesai({ peminjamanId, alasan: "lagi", penggunaId: petugas.id }))).toBe("SUDAH_SELESAI");
  });
});
