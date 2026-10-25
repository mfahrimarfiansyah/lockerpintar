const catatan = new Map<string, number[]>();

/** Pembatas laju sederhana di memori: true bila masih boleh. */
export function batasLaju(kunci: string, maks: number, jendelaMs: number, kini = Date.now()): boolean {
  const daftar = (catatan.get(kunci) ?? []).filter((t) => kini - t < jendelaMs);
  if (daftar.length >= maks) {
    catatan.set(kunci, daftar);
    return false;
  }
  daftar.push(kini);
  catatan.set(kunci, daftar);
  return true;
}
