import { describe, expect, it } from "vitest";
import { nomorDariKodeKartu, normalisasiKodeKartu, normalisasiNoWa, samarkanNomor } from "./kartu";
import { bacaTokenScan, buatTokenScan } from "./token-scan";
import { cocokPin, hashPin } from "./hash-pin";

describe("kartu", () => {
  it("menormalkan hasil scan", () => {
    expect(normalisasiKodeKartu("  abc123\r\n")).toBe("ABC123");
    expect(nomorDariKodeKartu("1000045")).toBe("1000045");
    expect(nomorDariKodeKartu("A1B2C3")).toBeNull();
  });

  it("menyamarkan nomor ID", () => {
    expect(samarkanNomor("2021110045")).toBe("20******45");
    expect(samarkanNomor("1000045")).toBe("10***45");
    expect(samarkanNomor("K1234")).toBe("K***4");
    expect(samarkanNomor("1234")).toBe("****");
  });

  it("menormalkan nomor WhatsApp", () => {
    expect(normalisasiNoWa("0812-3456-7890")).toBe("6281234567890");
    expect(normalisasiNoWa("+62 812 3456 7890")).toBe("6281234567890");
    expect(normalisasiNoWa("12")).toBeNull();
  });
});

describe("token scan", () => {
  const isi = { k: "K1", p: "p1", u: "u1", l: "l1", pin: false };

  it("terbaca selama belum kedaluwarsa", () => {
    const token = buatTokenScan(isi, 1_000);
    expect(bacaTokenScan(token, 2_000)).toMatchObject(isi);
    expect(bacaTokenScan(token, 1_000 + 121_000)).toBeNull();
  });

  it("menolak token yang diubah", () => {
    const [, tanda] = buatTokenScan(isi, 1_000).split(".");
    const palsu = Buffer.from(JSON.stringify({ ...isi, pin: true, exp: 9_999_999_999_999 })).toString("base64url");
    expect(bacaTokenScan(`${palsu}.${tanda}`, 2_000)).toBeNull();
  });
});

describe("hash PIN", () => {
  it("cocok hanya untuk PIN yang benar", async () => {
    const hash = await hashPin("1234");
    expect(await cocokPin("1234", hash)).toBe(true);
    expect(await cocokPin("4321", hash)).toBe(false);
  });
});
