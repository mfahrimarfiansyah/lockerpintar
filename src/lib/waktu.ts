// Utilitas waktu berbasis zona waktu lokasi (Indonesia tidak memakai DST).

export type BagianWaktu = {
  tahun: number;
  bulan: number;
  tanggal: number;
  jam: number;
  menit: number;
  detik: number;
};

const cacheFormat = new Map<string, Intl.DateTimeFormat>();

function formatBagian(zonaWaktu: string) {
  let f = cacheFormat.get(zonaWaktu);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: zonaWaktu,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    cacheFormat.set(zonaWaktu, f);
  }
  return f;
}

export function bagianLokal(waktu: Date, zonaWaktu: string): BagianWaktu {
  const bagian = Object.fromEntries(
    formatBagian(zonaWaktu)
      .formatToParts(waktu)
      .map((p) => [p.type, p.value]),
  );
  return {
    tahun: Number(bagian.year),
    bulan: Number(bagian.month),
    tanggal: Number(bagian.day),
    jam: Number(bagian.hour),
    menit: Number(bagian.minute),
    detik: Number(bagian.second),
  };
}

/** Mengubah tanggal & jam lokal di zona tertentu menjadi instan UTC. */
export function waktuLokalKeUtc(
  tahun: number,
  bulan: number,
  tanggal: number,
  jam: number,
  menit: number,
  zonaWaktu: string,
): Date {
  const tebakan = Date.UTC(tahun, bulan - 1, tanggal, jam, menit);
  const b = bagianLokal(new Date(tebakan), zonaWaktu);
  const selisih = Date.UTC(b.tahun, b.bulan - 1, b.tanggal, b.jam, b.menit, b.detik) - tebakan;
  return new Date(tebakan - selisih);
}

export function parseJam(teks: string): { jam: number; menit: number } {
  const cocok = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(teks);
  if (!cocok) throw new Error(`Format jam tidak valid: ${teks}`);
  return { jam: Number(cocok[1]), menit: Number(cocok[2]) };
}

export function jamValid(teks: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(teks);
}

function menitDariJam(teks: string) {
  const { jam, menit } = parseJam(teks);
  return jam * 60 + menit;
}

/** Batas pinjam: jam tutup lokasi pada hari (lokal) yang sama. */
export function batasHariIni(sekarang: Date, zonaWaktu: string, jamTutup: string): Date {
  const b = bagianLokal(sekarang, zonaWaktu);
  const { jam, menit } = parseJam(jamTutup);
  return waktuLokalKeUtc(b.tahun, b.bulan, b.tanggal, jam, menit, zonaWaktu);
}

export function dalamJamBuka(sekarang: Date, zonaWaktu: string, jamBuka: string, jamTutup: string): boolean {
  const b = bagianLokal(sekarang, zonaWaktu);
  const menitSekarang = b.jam * 60 + b.menit;
  return menitSekarang >= menitDariJam(jamBuka) && menitSekarang < menitDariJam(jamTutup);
}

export function awalHariIni(sekarang: Date, zonaWaktu: string): Date {
  const b = bagianLokal(sekarang, zonaWaktu);
  return waktuLokalKeUtc(b.tahun, b.bulan, b.tanggal, 0, 0, zonaWaktu);
}

/** "17.00" */
export function formatJam(waktu: Date | string, zonaWaktu: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: zonaWaktu,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(waktu));
}

/** "24 Okt 2026 17.00" */
export function formatTanggalJam(waktu: Date | string, zonaWaktu: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: zonaWaktu,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(waktu));
}

/** Label singkat: "17.00" bila hari ini, selain itu "23 Okt 17.00". */
export function formatWaktuSingkat(waktu: Date | string, sekarang: Date, zonaWaktu: string): string {
  const w = new Date(waktu);
  const a = bagianLokal(w, zonaWaktu);
  const b = bagianLokal(sekarang, zonaWaktu);
  if (a.tahun === b.tahun && a.bulan === b.bulan && a.tanggal === b.tanggal) return formatJam(w, zonaWaktu);
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: zonaWaktu,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(w);
}

export const ZONA_WAKTU_INDONESIA = [
  { nilai: "Asia/Jakarta", label: "WIB (Asia/Jakarta)" },
  { nilai: "Asia/Makassar", label: "WITA (Asia/Makassar)" },
  { nilai: "Asia/Jayapura", label: "WIT (Asia/Jayapura)" },
] as const;
