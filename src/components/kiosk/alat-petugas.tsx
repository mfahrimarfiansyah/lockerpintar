"use client";

import { useState } from "react";
import { WrenchIcon } from "lucide-react";
import type { Hasil } from "@/aksi/hasil";
import type { ProfilKiosk } from "@/aksi/kiosk-bantu";
import { aksiGantiKartu, aksiPaksaBuka, aksiPaksaSelesai, aksiResetPin } from "@/aksi/petugas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Permintaan =
  | { jenis: "paksaBuka" | "paksaSelesai"; peminjamanId: string; lokerKode: string }
  | { jenis: "gantiKartu" };

/** Tindakan khusus petugas di layar scan: semua tercatat di log. */
export function AlatPetugas({
  profil,
  lokasiId,
  onSelesai,
}: {
  profil: ProfilKiosk;
  lokasiId: string;
  onSelesai: (pesan: string) => void;
}) {
  const [permintaan, setPermintaan] = useState<Permintaan | null>(null);
  const [isian, setIsian] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const diSini = profil.pinjamanAktif.filter((p) => p.lokasiId === lokasiId);

  async function jalankan(kerja: () => Promise<Hasil<string>>) {
    setSibuk(true);
    setGalat(null);
    const h = await kerja();
    setSibuk(false);
    if (!h.ok) return setGalat(h.pesan);
    setPermintaan(null);
    onSelesai(h.data);
  }

  function kirim() {
    if (!permintaan) return;
    if (permintaan.jenis === "gantiKartu") {
      return jalankan(() => aksiGantiKartu({ peminjamId: profil.peminjamId, kodeKartu: isian }));
    }
    const aksi = permintaan.jenis === "paksaBuka" ? aksiPaksaBuka : aksiPaksaSelesai;
    return jalankan(() => aksi({ peminjamanId: permintaan.peminjamanId, alasan: isian }));
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-md border-2 border-tinta">
      <p className="hazard flex items-center gap-1.5 border-b-2 border-tinta px-3 py-1.5">
        <span className="flex items-center gap-1.5 rounded-[3px] bg-tinta px-2 py-0.5 text-xs font-bold tracking-[0.1em] text-kuning uppercase">
          <WrenchIcon className="size-3.5" aria-hidden />
          Alat petugas
        </span>
      </p>
      <div className="flex flex-wrap gap-2 p-3">
        {diSini.map((p) => (
          <div key={p.id} className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsian("");
                setPermintaan({ jenis: "paksaBuka", peminjamanId: p.id, lokerKode: p.lokerKode });
              }}
            >
              Paksa buka {p.lokerKode}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsian("");
                setPermintaan({ jenis: "paksaSelesai", peminjamanId: p.id, lokerKode: p.lokerKode });
              }}
            >
              Paksa selesai {p.lokerKode}
            </Button>
          </div>
        ))}
        <Button
          size="sm"
          variant="outline"
          disabled={sibuk}
          onClick={() => jalankan(() => aksiResetPin({ peminjamId: profil.peminjamId }))}
        >
          Reset PIN
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setIsian("");
            setPermintaan({ jenis: "gantiKartu" });
          }}
        >
          Ganti kartu
        </Button>
      </div>
      {galat && !permintaan && (
        <p role="alert" className="px-3 pb-3 text-sm font-semibold text-destructive">
          {galat}
        </p>
      )}

      <Dialog open={permintaan !== null} onOpenChange={(v) => !v && setPermintaan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {permintaan?.jenis === "gantiKartu"
                ? "Ganti kartu"
                : permintaan?.jenis === "paksaBuka"
                  ? `Paksa buka loker ${permintaan.lokerKode}`
                  : `Paksa selesai loker ${permintaan?.jenis === "paksaSelesai" ? permintaan.lokerKode : ""}`}
            </DialogTitle>
            <DialogDescription>
              {permintaan?.jenis === "gantiKartu"
                ? `Scan kartu baru milik ${profil.nama}. Kartu lama tidak berlaku lagi.`
                : "Pastikan identitas pemilik kartu sudah diperiksa. Alasan wajib diisi dan tercatat di log."}
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void kirim();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="isian-petugas">{permintaan?.jenis === "gantiKartu" ? "Kode kartu baru" : "Alasan"}</Label>
              <Input
                id="isian-petugas"
                value={isian}
                onChange={(e) => setIsian(e.target.value)}
                autoFocus
                autoComplete="off"
                placeholder={permintaan?.jenis === "gantiKartu" ? "Scan kartu baru di sini" : "mis. lupa PIN, kartu hilang"}
              />
            </div>
            {galat && (
              <p role="alert" className="text-sm text-destructive">
                {galat}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={sibuk || isian.trim().length < 3}>
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
