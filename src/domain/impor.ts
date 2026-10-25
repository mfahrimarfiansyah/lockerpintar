import ExcelJS from "exceljs";
import { GalatDomain } from "./galat";
import type { BarisImpor } from "./peminjam-admin";

// Judul kolom yang dikenali (huruf kecil, tanpa spasi/titik), termasuk judul dari data sekolah/kampus (nim, nis, prodi, kelas).
const ALIAS_KOLOM: Record<string, keyof BarisImpor> = {
  nomor: "nomorInduk",
  nomorid: "nomorInduk",
  nomor_id: "nomorInduk",
  noid: "nomorInduk",
  no_id: "nomorInduk",
  idanggota: "nomorInduk",
  id_anggota: "nomorInduk",
  noanggota: "nomorInduk",
  no_anggota: "nomorInduk",
  nomorinduk: "nomorInduk",
  nomor_induk: "nomorInduk",
  nik: "nomorInduk",
  nip: "nomorInduk",
  nis: "nomorInduk",
  nim: "nomorInduk",
  npm: "nomorInduk",
  nama: "nama",
  namalengkap: "nama",
  nama_lengkap: "nama",
  unit: "unit",
  divisi: "unit",
  bagian: "unit",
  departemen: "unit",
  kelas: "unit",
  prodi: "unit",
  programstudi: "unit",
  program_studi: "unit",
  jurusan: "unit",
  nowa: "noWa",
  no_wa: "noWa",
  wa: "noWa",
  whatsapp: "noWa",
  nohp: "noWa",
  no_hp: "noWa",
  hp: "noWa",
};

function kunciKolom(judul: string): keyof BarisImpor | undefined {
  const k = judul.trim().toLowerCase().replace(/[\s.]+/g, "");
  return ALIAS_KOLOM[k] ?? ALIAS_KOLOM[judul.trim().toLowerCase().replace(/\s+/g, "_")];
}

function keBaris(judul: string[], data: string[][]): BarisImpor[] {
  const peta = judul.map(kunciKolom);
  if (!peta.includes("nomorInduk") || !peta.includes("nama")) {
    throw new GalatDomain("DATA_TIDAK_VALID", "Baris pertama harus berisi judul kolom, minimal: nomor, nama.");
  }
  return data
    .filter((sel) => sel.some((s) => s.trim() !== ""))
    .map((sel) => {
      const baris: BarisImpor = { nomorInduk: "", nama: "" };
      peta.forEach((kunci, i) => {
        if (kunci) baris[kunci] = (sel[i] ?? "").trim();
      });
      return baris;
    });
}

/** CSV dengan pemisah koma atau titik koma (Excel versi Indonesia), mendukung tanda kutip. */
export function uraiCsv(teks: string): string[][] {
  const bersih = teks.replace(/^\uFEFF/, "");
  const barisPertama = bersih.split(/\r?\n/, 1)[0] ?? "";
  const pemisah = (barisPertama.match(/;/g)?.length ?? 0) > (barisPertama.match(/,/g)?.length ?? 0) ? ";" : ",";
  const hasil: string[][] = [];
  let baris: string[] = [];
  let sel = "";
  let dalamKutip = false;
  for (let i = 0; i < bersih.length; i++) {
    const c = bersih[i];
    if (dalamKutip) {
      if (c === '"' && bersih[i + 1] === '"') {
        sel += '"';
        i++;
      } else if (c === '"') dalamKutip = false;
      else sel += c;
    } else if (c === '"') dalamKutip = true;
    else if (c === pemisah) {
      baris.push(sel);
      sel = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && bersih[i + 1] === "\n") i++;
      baris.push(sel);
      hasil.push(baris);
      baris = [];
      sel = "";
    } else sel += c;
  }
  if (sel !== "" || baris.length) {
    baris.push(sel);
    hasil.push(baris);
  }
  return hasil;
}

function teksSel(nilai: ExcelJS.CellValue): string {
  if (nilai === null || nilai === undefined) return "";
  if (typeof nilai === "object") {
    if ("text" in nilai && typeof nilai.text === "string") return nilai.text;
    if ("result" in nilai) return String(nilai.result ?? "");
    if ("richText" in nilai) return nilai.richText.map((r) => r.text).join("");
    if (nilai instanceof Date) return nilai.toISOString();
  }
  return String(nilai);
}

export async function bacaFileImpor(namaFile: string, isi: ArrayBuffer): Promise<BarisImpor[]> {
  const nama = namaFile.toLowerCase();
  if (nama.endsWith(".csv")) {
    const [judul, ...data] = uraiCsv(new TextDecoder("utf-8").decode(isi));
    if (!judul) throw new GalatDomain("DATA_TIDAK_VALID", "File CSV kosong.");
    return keBaris(judul, data);
  }
  if (nama.endsWith(".xlsx")) {
    const buku = new ExcelJS.Workbook();
    await buku.xlsx.load(isi);
    const lembar = buku.worksheets[0];
    if (!lembar) throw new GalatDomain("DATA_TIDAK_VALID", "File Excel tidak berisi lembar kerja.");
    const semua: string[][] = [];
    lembar.eachRow({ includeEmpty: false }, (row) => {
      const sel: string[] = [];
      for (let i = 1; i <= lembar.columnCount; i++) sel.push(teksSel(row.getCell(i).value));
      semua.push(sel);
    });
    const [judul, ...data] = semua;
    if (!judul) throw new GalatDomain("DATA_TIDAK_VALID", "File Excel kosong.");
    return keBaris(judul, data);
  }
  throw new GalatDomain("DATA_TIDAK_VALID", "Format file harus .csv atau .xlsx.");
}
