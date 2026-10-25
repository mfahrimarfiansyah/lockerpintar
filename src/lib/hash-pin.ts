import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const N = 16384;
const R = 8;
const P = 1;
const PANJANG = 32;
const MAKS_MEMORI = 64 * 1024 * 1024;

function turunkan(pin: string, garam: Buffer, panjang: number, opsi: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(pin, garam, panjang, { ...opsi, maxmem: MAKS_MEMORI }, (err, hasil) => (err ? reject(err) : resolve(hasil)));
  });
}

export function pinValid(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

/** Format: scrypt$N$r$p$garam$hash (base64) */
export async function hashPin(pin: string): Promise<string> {
  const garam = randomBytes(16);
  const hash = await turunkan(pin, garam, PANJANG, { N, r: R, p: P });
  return ["scrypt", N, R, P, garam.toString("base64"), hash.toString("base64")].join("$");
}

export async function cocokPin(pin: string, tersimpan: string): Promise<boolean> {
  const [alg, n, r, p, garamB64, hashB64] = tersimpan.split("$");
  if (alg !== "scrypt" || !garamB64 || !hashB64) return false;
  const harapan = Buffer.from(hashB64, "base64");
  const hasil = await turunkan(pin, Buffer.from(garamB64, "base64"), harapan.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return hasil.length === harapan.length && timingSafeEqual(hasil, harapan);
}
