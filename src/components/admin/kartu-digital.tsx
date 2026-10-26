"use client";

import { useEffect, useRef, useState } from "react";
import { DownloadIcon, PrinterIcon, QrCodeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PropsKartuDigital {
  nomorInduk: string;
  nama: string;
  unit?: string | null;
  kodeKartu?: string | null;
}

/**
 * Komponen kartu digital anggota — menampilkan QR code dari kodeKartu
 * (atau nomorInduk jika belum punya kartu) yang bisa di-download/cetak.
 */
export function KartuDigital({ nomorInduk, nama, unit, kodeKartu }: PropsKartuDigital) {
  const [buka, setBuka] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Kode yang di-encode ke QR: gunakan kodeKartu jika ada, fallback ke nomorInduk
  const kodeQR = kodeKartu ?? nomorInduk;

  useEffect(() => {
    if (!buka) return;
    setDataUrl(null);
    setGalat(null);

    (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Render QR ke canvas
        await QRCode.toCanvas(canvas, kodeQR, {
          width: 220,
          margin: 2,
          color: { dark: "#1a1a2e", light: "#fffdf5" },
          errorCorrectionLevel: "H",
        });

        // Buat gambar kartu lengkap di canvas besar
        const kartu = document.createElement("canvas");
        kartu.width = 600;
        kartu.height = 360;
        const ctx = kartu.getContext("2d")!;

        // Background kartu — warna gelap LockerPintar
        ctx.fillStyle = "#1a1a2e";
        ctx.roundRect(0, 0, 600, 360, 16);
        ctx.fill();

        // Strip aksen atas
        ctx.fillStyle = "#a3e635"; // limau
        ctx.fillRect(0, 0, 600, 8);

        // Strip bawah magenta
        ctx.fillStyle = "#e879f9"; // magenta
        ctx.fillRect(0, 352, 600, 8);

        // Judul "LockerPintar"
        ctx.fillStyle = "#a3e635";
        ctx.font = "bold 28px 'Arial Black', Arial, sans-serif";
        ctx.fillText("LOCKER", 36, 56);
        ctx.fillStyle = "#e879f9";
        ctx.fillText("PINTAR", 36, 86);

        // Label KARTU ANGGOTA
        ctx.fillStyle = "#94a3b8";
        ctx.font = "11px Arial, sans-serif";
        ctx.letterSpacing = "3px";
        ctx.fillText("KARTU ANGGOTA", 36, 112);
        ctx.letterSpacing = "0px";

        // Garis pemisah
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(36, 130);
        ctx.lineTo(340, 130);
        ctx.stroke();

        // Nama anggota
        ctx.fillStyle = "#f8fafc";
        ctx.font = "bold 22px Arial, sans-serif";
        // Potong nama jika terlalu panjang
        const namaTampil = nama.length > 24 ? nama.slice(0, 22) + "…" : nama;
        ctx.fillText(namaTampil, 36, 168);

        // Nomor ID
        ctx.fillStyle = "#94a3b8";
        ctx.font = "12px 'Courier New', monospace";
        ctx.fillText("ID", 36, 196);
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "bold 14px 'Courier New', monospace";
        ctx.fillText(nomorInduk, 60, 196);

        // Unit
        if (unit) {
          ctx.fillStyle = "#94a3b8";
          ctx.font = "12px Arial, sans-serif";
          const unitTampil = unit.length > 30 ? unit.slice(0, 28) + "…" : unit;
          ctx.fillText(unitTampil, 36, 222);
        }

        // Kode kartu (jika ada)
        if (kodeKartu) {
          ctx.fillStyle = "#475569";
          ctx.font = "10px 'Courier New', monospace";
          ctx.fillText("KODE: " + kodeKartu, 36, 290);
        } else {
          ctx.fillStyle = "#f59e0b";
          ctx.font = "bold 10px Arial, sans-serif";
          ctx.fillText("★ SCAN QR INI UNTUK REGISTRASI", 36, 290);
        }

        // Tempel QR canvas ke kartu (kanan)
        ctx.drawImage(canvas, 352, 70, 220, 220);

        // Label di bawah QR
        ctx.fillStyle = "#475569";
        ctx.font = "9px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Scan QR di kiosk", 462, 308);
        ctx.textAlign = "left";

        setDataUrl(kartu.toDataURL("image/png"));
      } catch (e) {
        console.error(e);
        setGalat("Gagal membuat QR code. Coba refresh halaman.");
      }
    })();
  }, [buka, kodeQR, kodeKartu, nama, nomorInduk, unit]);

  const unduh = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `kartu-${nomorInduk}.png`;
    a.click();
  };

  const cetak = () => {
    if (!dataUrl) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Kartu Anggota – ${nama}</title>
          <style>
            body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f1f5f9; }
            img { max-width: 600px; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,.2); }
            @media print { body { background: white; } img { box-shadow: none; } }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" alt="Kartu Anggota ${nama}" />
          <script>window.onload = () => { window.print(); window.close(); }<\/script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <Dialog open={buka} onOpenChange={setBuka}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" id={`btn-kartu-digital-${nomorInduk}`}>
          <QrCodeIcon className="size-4" aria-hidden />
          Kartu digital
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Kartu Digital Anggota</DialogTitle>
          <DialogDescription>
            QR code ini dipakai anggota untuk scan di kiosk.{" "}
            {!kodeKartu && (
              <span className="font-semibold text-amber-600">
                Anggota belum punya kartu — QR ini berisi nomor ID sebagai pengganti sementara.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Canvas tersembunyi untuk render QR */}
        <canvas ref={canvasRef} className="hidden" />

        <div className="flex flex-col items-center gap-4">
          {galat ? (
            <p className="text-sm text-destructive">{galat}</p>
          ) : dataUrl ? (
            <img
              src={dataUrl}
              alt={`Kartu digital ${nama}`}
              className="w-full max-w-sm rounded-xl border shadow-md"
            />
          ) : (
            <div className="flex h-48 w-full items-center justify-center rounded-xl border bg-muted">
              <span className="text-sm text-muted-foreground">Membuat kartu…</span>
            </div>
          )}

          <div className="flex w-full gap-2">
            <Button
              type="button"
              variant="default"
              className="flex-1"
              disabled={!dataUrl}
              onClick={unduh}
              id={`btn-unduh-kartu-${nomorInduk}`}
            >
              <DownloadIcon className="size-4" aria-hidden />
              Unduh PNG
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={!dataUrl}
              onClick={cetak}
              id={`btn-cetak-kartu-${nomorInduk}`}
            >
              <PrinterIcon className="size-4" aria-hidden />
              Cetak
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Kode QR: <code className="font-mono">{kodeQR}</code>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
