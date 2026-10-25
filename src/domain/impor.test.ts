import { describe, expect, it } from "vitest";
import { bacaFileImpor, uraiCsv } from "./impor";

const sebagaiBuffer = (teks: string) => new TextEncoder().encode(teks).buffer as ArrayBuffer;

describe("impor CSV", () => {
  it("mendukung titik koma, tanda kutip, dan CRLF", () => {
    expect(uraiCsv('nomor;nama\n"123";"Budi; S"\r\n456;Ani')).toEqual([
      ["nomor", "nama"],
      ["123", "Budi; S"],
      ["456", "Ani"],
    ]);
  });

  it("memetakan judul kolom umum", async () => {
    const csv = "Nomor ID,Nama Lengkap,Divisi,No WA\nK-001,Dewi,Keuangan,0812345678\n\n";
    expect(await bacaFileImpor("anggota.csv", sebagaiBuffer(csv))).toEqual([
      { nomorInduk: "K-001", nama: "Dewi", unit: "Keuangan", noWa: "0812345678" },
    ]);
  });

  it("tetap menerima judul kolom data sekolah/kampus", async () => {
    const csv = "NIM,Nama,Program Studi\n2024001,Dewi,Informatika";
    expect(await bacaFileImpor("data.csv", sebagaiBuffer(csv))).toEqual([
      { nomorInduk: "2024001", nama: "Dewi", unit: "Informatika" },
    ]);
  });

  it("menolak file tanpa kolom nomor & nama", async () => {
    await expect(bacaFileImpor("x.csv", sebagaiBuffer("a,b\n1,2"))).rejects.toThrow(/judul kolom/);
  });
});
