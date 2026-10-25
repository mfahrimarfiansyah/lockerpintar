import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Token singkat yang diberikan setelah kartu di-scan. Mengikat akun kiosk/petugas,
 * lokasi, dan peminjam, sehingga aksi berikutnya tidak memercayai ID dari browser.
 */
export type IsiTokenScan = {
  /** kode kartu yang di-scan (null bila dicari lewat nomor ID oleh petugas) */
  k: string | null;
  /** id peminjam (null bila kartu belum terdaftar) */
  p: string | null;
  /** id pengguna (akun kiosk/petugas) yang memindai */
  u: string;
  /** id lokasi */
  l: string;
  /** PIN sudah diverifikasi pada sesi scan ini */
  pin: boolean;
  /** kedaluwarsa (epoch ms) */
  exp: number;
};

export const UMUR_TOKEN_DETIK = 120;

function kunci(): Buffer {
  const rahasia = process.env.BETTER_AUTH_SECRET;
  if (!rahasia) throw new Error("BETTER_AUTH_SECRET belum diatur");
  return createHmac("sha256", rahasia).update("lockerpintar:token-scan:v1").digest();
}

export function buatTokenScan(isi: Omit<IsiTokenScan, "exp">, sekarang = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ ...isi, exp: sekarang + UMUR_TOKEN_DETIK * 1000 })).toString(
    "base64url",
  );
  const tanda = createHmac("sha256", kunci()).update(payload).digest("base64url");
  return `${payload}.${tanda}`;
}

export function bacaTokenScan(token: string, sekarang = Date.now()): IsiTokenScan | null {
  const [payload, tanda] = token.split(".");
  if (!payload || !tanda) return null;
  const harapan = createHmac("sha256", kunci()).update(payload).digest();
  const aktual = Buffer.from(tanda, "base64url");
  if (aktual.length !== harapan.length || !timingSafeEqual(aktual, harapan)) return null;
  try {
    const isi = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as IsiTokenScan;
    if (typeof isi.exp !== "number" || isi.exp < sekarang) return null;
    return isi;
  } catch {
    return null;
  }
}
