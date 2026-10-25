"use client";

import { useEffect, useState } from "react";
import { DeleteIcon, LoaderCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  judul: string;
  keterangan?: string;
  labelKirim?: string;
  sibuk?: boolean;
  galat?: string | null;
  onKirim: (pin: string) => void;
};

const MAKS = 6;
const MIN = 4;

export function KeypadPin({ judul, keterangan, labelKirim = "OK", sibuk, galat, onKirim }: Props) {
  const [pin, setPin] = useState("");
  const bisaKirim = pin.length >= MIN && !sibuk;

  useEffect(() => {
    function tombol(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (/^\d$/.test(e.key)) setPin((p) => (p.length < MAKS ? p + e.key : p));
      else if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
      else if (e.key === "Enter" && pin.length >= MIN && !sibuk) {
        e.preventDefault();
        onKirim(pin);
      }
    }
    window.addEventListener("keydown", tombol);
    return () => window.removeEventListener("keydown", tombol);
  }, [pin, sibuk, onKirim]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="huruf-judul text-xl leading-tight">{judul}</p>
        {keterangan && <p className="text-sm font-medium text-muted-foreground">{keterangan}</p>}
      </div>
      <div className="flex gap-2" aria-label={`${pin.length} angka dimasukkan`} role="status">
        {Array.from({ length: MAKS }, (_, i) => (
          <span
            key={i}
            className={cn(
              "size-4 rotate-45 rounded-[3px] border-2 border-tinta transition-colors duration-100",
              i < pin.length ? "bg-limau shadow-[2px_2px_0_0_var(--tinta)]" : "bg-transparent",
              i >= MIN && i >= pin.length && "border-dashed opacity-45",
            )}
          />
        ))}
      </div>
      {galat && (
        <p role="alert" className="rounded-md border-2 border-tinta bg-magenta px-3 py-1.5 text-center text-sm font-semibold text-tinta">
          {galat}
        </p>
      )}
      <div className="grid w-full max-w-80 grid-cols-3 gap-2.5">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <Button
            key={d}
            type="button"
            variant="outline"
            className="huruf-stensil h-16 text-3xl font-extrabold"
            onClick={() => setPin((p) => (p.length < MAKS ? p + d : p))}
          >
            {d}
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          className="h-16"
          aria-label="Hapus angka"
          onClick={() => setPin((p) => p.slice(0, -1))}
        >
          <DeleteIcon className="size-7" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="outline"
          className="huruf-stensil h-16 text-3xl font-extrabold"
          onClick={() => setPin((p) => (p.length < MAKS ? p + "0" : p))}
        >
          0
        </Button>
        <Button type="button" className="h-16 text-lg font-bold" disabled={!bisaKirim} onClick={() => onKirim(pin)}>
          {sibuk ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : labelKirim}
        </Button>
      </div>
    </div>
  );
}
