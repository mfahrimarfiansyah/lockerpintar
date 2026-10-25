"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { Hasil } from "@/aksi/hasil";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Menjalankan Server Action dengan status sibuk & notifikasi toast. */
export function useAksi() {
  const [sibuk, setSibuk] = useState(false);
  async function jalankan<T>(kerja: () => Promise<Hasil<T>>, pesanSukses?: (data: T) => string | null) {
    setSibuk(true);
    try {
      const h = await kerja();
      if (h.ok) {
        const pesan = pesanSukses ? pesanSukses(h.data) : typeof h.data === "string" ? h.data : null;
        if (pesan) toast.success(pesan);
      } else {
        toast.error(h.pesan);
      }
      return h;
    } catch {
      toast.error("Gagal terhubung ke server.");
      return null;
    } finally {
      setSibuk(false);
    }
  }
  return { sibuk, jalankan };
}

type PropsDialogIsian = {
  pemicu: ReactNode;
  judul: string;
  deskripsi?: string;
  label: string;
  placeholder?: string;
  labelKirim?: string;
  tipe?: "text" | "password";
  minimal?: number;
  destruktif?: boolean;
  onKirim: (isian: string) => Promise<boolean>;
};

/** Dialog satu isian (alasan, password baru, kode kartu, dll.). */
export function DialogIsian({
  pemicu,
  judul,
  deskripsi,
  label,
  placeholder,
  labelKirim = "Simpan",
  tipe = "text",
  minimal = 3,
  destruktif,
  onKirim,
}: PropsDialogIsian) {
  const [buka, setBuka] = useState(false);
  const [isian, setIsian] = useState("");
  const [sibuk, setSibuk] = useState(false);
  return (
    <Dialog
      open={buka}
      onOpenChange={(v) => {
        setBuka(v);
        if (v) setIsian("");
      }}
    >
      <DialogTrigger asChild>{pemicu}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{judul}</DialogTitle>
          {deskripsi && <DialogDescription>{deskripsi}</DialogDescription>}
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setSibuk(true);
            const ok = await onKirim(isian.trim());
            setSibuk(false);
            if (ok) setBuka(false);
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dialog-isian">{label}</Label>
            <Input
              id="dialog-isian"
              type={tipe}
              value={isian}
              placeholder={placeholder}
              autoComplete="off"
              autoFocus
              onChange={(e) => setIsian(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              variant={destruktif ? "destructive" : "default"}
              disabled={sibuk || isian.trim().length < minimal}
            >
              {labelKirim}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
