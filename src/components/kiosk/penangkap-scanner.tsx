"use client";

import { useEffect, useRef } from "react";

const JEDA_SCAN_GANDA_MS = 2_000;

/**
 * Scanner USB (barcode/QR/RFID) bekerja seperti keyboard: mengetik kode lalu Enter.
 * Input tersembunyi ini selalu difokuskan; inputMode="none" mencegah keyboard layar muncul.
 */
export function PenangkapScanner({ aktif, onScan }: { aktif: boolean; onScan: (kode: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const terakhir = useRef<{ kode: string; waktu: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!aktif) {
      // Lepas fokus agar ketikan (mis. PIN dari keyboard) tidak menumpuk di buffer scanner.
      if (el && document.activeElement === el) el.blur();
      return;
    }
    // Kembali ke layar awal: mulai bersih, kartu yang sama boleh di-scan lagi.
    terakhir.current = null;
    if (el) el.value = "";
    const fokus = () => {
      const aktifSekarang = document.activeElement;
      const sedangMengetik =
        aktifSekarang instanceof HTMLInputElement ||
        aktifSekarang instanceof HTMLTextAreaElement ||
        aktifSekarang instanceof HTMLSelectElement;
      if (el && aktifSekarang !== el && !sedangMengetik && !document.querySelector("[role=dialog]")) {
        el.focus({ preventScroll: true });
      }
    };
    fokus();
    const id = window.setInterval(fokus, 800);
    return () => window.clearInterval(id);
  }, [aktif]);

  return (
    <input
      ref={ref}
      aria-label="Input scanner kartu"
      data-testid="input-scanner"
      inputMode="none"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      className="pointer-events-none fixed top-0 left-0 size-px opacity-0"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const kode = e.currentTarget.value.trim();
        e.currentTarget.value = "";
        if (!aktif || kode.length < 3) return;
        const kini = Date.now();
        if (terakhir.current?.kode === kode && kini - terakhir.current.waktu < JEDA_SCAN_GANDA_MS) return;
        terakhir.current = { kode, waktu: kini };
        onScan(kode);
      }}
    />
  );
}
