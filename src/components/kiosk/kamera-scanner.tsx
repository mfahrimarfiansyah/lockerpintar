"use client";

import { useEffect, useRef, useState } from "react";
import { CameraIcon } from "lucide-react";
import type { BarcodeDetector as TipeBarcodeDetector } from "barcode-detector/ponyfill";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type KonstruktorDetektor = typeof TipeBarcodeDetector;

const FORMAT_DIINGINKAN: string[] = [
  "qr_code",
  "code_128",
  "code_39",
  "code_93",
  "codabar",
  "ean_13",
  "ean_8",
  "itf",
  "upc_a",
  "upc_e",
  "data_matrix",
  "pdf417",
];

async function muatDetektor(): Promise<KonstruktorDetektor> {
  const bawaan = (window as unknown as { BarcodeDetector?: KonstruktorDetektor }).BarcodeDetector;
  if (bawaan) return bawaan;
  return (await import("barcode-detector/ponyfill")).BarcodeDetector;
}

/** Cadangan bila scanner USB tidak ada: baca barcode/QR kartu lewat kamera tablet. */
export function KameraScanner({ onHasil, disabled }: { onHasil: (kode: string) => void; disabled?: boolean }) {
  const [buka, setBuka] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!buka) return;
    let berhenti = false;
    let stream: MediaStream | null = null;
    let timer = 0;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (berhenti || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const Detektor = await muatDetektor();
        const didukung = await Detektor.getSupportedFormats();
        const detektor = new Detektor({ formats: didukung.filter((f) => FORMAT_DIINGINKAN.includes(f)) });
        const pindai = async () => {
          if (berhenti || !video.current) return;
          try {
            const [hasil] = await detektor.detect(video.current);
            if (hasil?.rawValue) {
              setBuka(false);
              onHasil(hasil.rawValue);
              return;
            }
          } catch {
            // frame belum siap; coba lagi
          }
          timer = window.setTimeout(pindai, 250);
        };
        void pindai();
      } catch {
        setGalat("Kamera tidak bisa dibuka. Pastikan izin kamera diberikan, atau gunakan scanner.");
      }
    })();

    return () => {
      berhenti = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [buka, onHasil]);

  return (
    <Dialog
      open={buka}
      onOpenChange={(v) => {
        setBuka(v);
        setGalat(null);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="lg" disabled={disabled}>
          <CameraIcon aria-hidden />
          Pakai kamera
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan kartu dengan kamera</DialogTitle>
          <DialogDescription>Arahkan barcode atau QR pada kartu ke kamera.</DialogDescription>
        </DialogHeader>
        {galat ? (
          <p className="text-sm text-destructive">{galat}</p>
        ) : (
          <video ref={video} className="aspect-video w-full rounded-lg bg-black object-cover" muted playsInline />
        )}
      </DialogContent>
    </Dialog>
  );
}
