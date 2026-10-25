export type KodeGalat =
  | "DATA_TIDAK_VALID"
  | "KARTU_TIDAK_VALID"
  | "KARTU_SUDAH_TERDAFTAR"
  | "NOMOR_TERHUBUNG_KARTU_LAIN"
  | "TIDAK_DITEMUKAN"
  | "DIBLOKIR"
  | "LOKASI_NONAKTIF"
  | "PERLU_BUAT_PIN"
  | "PIN_SUDAH_ADA"
  | "PERLU_PIN"
  | "PIN_SALAH"
  | "PIN_TERKUNCI"
  | "BATAS_PINJAM"
  | "DI_LUAR_JAM_BUKA"
  | "LOKER_TIDAK_TERSEDIA"
  | "LOKER_PENUH"
  | "BEDA_LOKASI"
  | "SUDAH_SELESAI"
  | "KUNCI_GAGAL";

/** Galat aturan bisnis; pesannya aman ditampilkan ke pengguna. */
export class GalatDomain extends Error {
  constructor(
    public readonly kode: KodeGalat,
    pesan: string,
    public readonly data?: Record<string, unknown>,
  ) {
    super(pesan);
    this.name = "GalatDomain";
  }
}

export function apakahGalatDomain(err: unknown): err is GalatDomain {
  return err instanceof GalatDomain;
}
