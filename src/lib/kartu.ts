/** Membersihkan hasil scan: buang karakter kontrol & spasi tepi, huruf besar. */
export function normalisasiKodeKartu(kode: string): string {
  return kode
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .toUpperCase();
}

export function kodeKartuValid(kode: string): boolean {
  return kode.length >= 3 && kode.length <= 128;
}

/** Banyak kartu (KTM, kartu karyawan, kartu member) menyimpan nomor ID langsung di barcode-nya. */
export function nomorDariKodeKartu(kode: string): string | null {
  return /^\d{5,20}$/.test(kode) ? kode : null;
}

/** 1000045 -> 10***45, 2021110045 -> 20******45 (hanya 2 digit awal & akhir yang terlihat) */
export function samarkanNomor(nomor: string): string {
  if (nomor.length <= 4) return "*".repeat(nomor.length);
  if (nomor.length <= 6) return nomor.slice(0, 1) + "*".repeat(nomor.length - 2) + nomor.slice(-1);
  return nomor.slice(0, 2) + "*".repeat(nomor.length - 4) + nomor.slice(-2);
}

/** 08123456789 / +62 812-3456-789 -> 628123456789 (untuk tautan wa.me) */
export function normalisasiNoWa(no: string): string | null {
  const digit = no.replace(/[^\d]/g, "");
  if (!digit) return null;
  let hasil = digit;
  if (hasil.startsWith("0")) hasil = "62" + hasil.slice(1);
  else if (hasil.startsWith("8")) hasil = "62" + hasil;
  return /^62\d{8,13}$/.test(hasil) ? hasil : null;
}
