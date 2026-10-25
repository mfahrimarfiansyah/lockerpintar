import { describe, expect, it } from "vitest";
import { awalHariIni, batasHariIni, dalamJamBuka, formatJam, waktuLokalKeUtc } from "./waktu";

const WITA = "Asia/Makassar";

describe("waktu", () => {
  it("batas pinjam = jam tutup pada hari yang sama (WITA)", () => {
    const sekarang = new Date("2026-10-24T03:00:00Z"); // 11.00 WITA
    expect(batasHariIni(sekarang, WITA, "17:00").toISOString()).toBe("2026-10-24T09:00:00.000Z");
  });

  it("memakai tanggal lokal, bukan tanggal UTC", () => {
    const sekarang = new Date("2026-10-24T17:30:00Z"); // 01.30 WITA tanggal 25
    expect(batasHariIni(sekarang, WITA, "17:00").toISOString()).toBe("2026-10-25T09:00:00.000Z");
  });

  it("mengecek jam buka 07.00–17.00", () => {
    const pada = (utc: string) => new Date(`2026-10-24T${utc}:00Z`);
    expect(dalamJamBuka(pada("22:59"), WITA, "07:00", "17:00")).toBe(false); // 06.59
    expect(dalamJamBuka(pada("23:00"), WITA, "07:00", "17:00")).toBe(true); // 07.00
    expect(dalamJamBuka(pada("08:59"), WITA, "07:00", "17:00")).toBe(true); // 16.59
    expect(dalamJamBuka(pada("09:00"), WITA, "07:00", "17:00")).toBe(false); // 17.00
  });

  it("mendukung WIB", () => {
    expect(waktuLokalKeUtc(2026, 10, 24, 17, 0, "Asia/Jakarta").toISOString()).toBe("2026-10-24T10:00:00.000Z");
  });

  it("format jam ala Indonesia & awal hari lokal", () => {
    expect(formatJam(new Date("2026-10-24T09:00:00Z"), WITA)).toBe("17.00");
    expect(awalHariIni(new Date("2026-10-24T03:00:00Z"), WITA).toISOString()).toBe("2026-10-23T16:00:00.000Z");
  });
});
