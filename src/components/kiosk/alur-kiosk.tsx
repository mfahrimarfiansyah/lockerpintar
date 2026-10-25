"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  ArrowDownIcon,
  CheckCircle2Icon,
  LoaderCircleIcon,
  MaximizeIcon,
  SearchIcon,
  ShuffleIcon,
  WifiOffIcon,
  XCircleIcon,
} from "lucide-react";
import type { Hasil } from "@/aksi/hasil";
import type { Layar, ProfilKiosk } from "@/aksi/kiosk-bantu";
import {
  aksiBuatPin,
  aksiBukaUlang,
  aksiCariNomor,
  aksiKembalikan,
  aksiPindai,
  aksiPinjam,
  aksiRegistrasi,
  aksiVerifikasiPin,
} from "@/aksi/kiosk";
import { Logo, TitikHidup } from "@/components/grafiti";
import { GridLoker, LegendaStatus } from "@/components/grid-loker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { StatusLokasi } from "@/data/publik";
import { cn } from "@/lib/utils";
import { formatJam, formatWaktuSingkat } from "@/lib/waktu";
import { AlatPetugas } from "./alat-petugas";
import { FormRegistrasi } from "./form-registrasi";
import { KameraScanner } from "./kamera-scanner";
import { KeypadPin } from "./keypad-pin";
import { PenangkapScanner } from "./penangkap-scanner";

export type LokasiKiosk = { id: string; nama: string; zonaWaktu: string };
type LayarUI = { layar: "awal" } | Layar;

type Props = {
  mode: "kiosk" | "petugas";
  lokasi: LokasiKiosk;
  resetDetik: number;
  awal?: StatusLokasi;
};

const BATAS_DIAM_MS = 60_000;

const JUDUL_GALAT: Record<string, string> = {
  DI_LUAR_JAM_BUKA: "Di luar jam layanan",
  LOKER_PENUH: "Loker penuh",
  KUNCI_GAGAL: "Loker gagal dibuka",
  PIN_TERKUNCI: "PIN terkunci",
  BATAS_PINJAM: "Belum bisa meminjam",
  DIBLOKIR: "Akses ditolak",
  AKSES: "Sesi berakhir",
  KARTU_SUDAH_TERDAFTAR: "Kartu sudah terdaftar",
  NOMOR_TERHUBUNG_KARTU_LAIN: "Nomor ID sudah terdaftar",
  KARTU_TIDAK_VALID: "Kartu tidak terbaca",
  TIDAK_DITEMUKAN: "Tidak ditemukan",
};

class GalatSesiKiosk extends Error {}

async function ambilStatus(lokasiId: string): Promise<StatusLokasi> {
  const res = await fetch(`/api/kiosk/status?lokasi=${encodeURIComponent(lokasiId)}`, { cache: "no-store" });
  if (res.status === 401) throw new GalatSesiKiosk();
  if (!res.ok) throw new Error(`Status ${res.status}`);
  return res.json();
}

export function AlurKiosk({ mode, lokasi, resetDetik, awal }: Props) {
  const [layar, setLayar] = useState<LayarUI>({ layar: "awal" });
  const [nomorLayar, setNomorLayar] = useState(0);
  const [pesan, setPesan] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [pilihan, setPilihan] = useState<string | null>(null);
  const [percobaanPin, setPercobaanPin] = useState(0);
  const lokasiId = mode === "petugas" ? lokasi.id : null;

  const status = useQuery({
    queryKey: ["kiosk-status", lokasi.id],
    queryFn: () => ambilStatus(lokasi.id),
    initialData: awal,
    refetchInterval: 5_000,
    retry: 1,
  });
  const sesiHabis = status.error instanceof GalatSesiKiosk;
  const offline = status.isError && !sesiHabis;

  const tampilkan = useCallback((berikut: LayarUI) => {
    setLayar(berikut);
    setNomorLayar((n) => n + 1);
    setPesan(null);
    setPilihan(null);
  }, []);
  const keAwal = useCallback(() => tampilkan({ layar: "awal" }), [tampilkan]);

  // Sesi scan tidak boleh tertinggal untuk orang berikutnya.
  useEffect(() => {
    if (layar.layar === "awal") return;
    let timer = window.setTimeout(keAwal, BATAS_DIAM_MS);
    const ulang = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(keAwal, BATAS_DIAM_MS);
    };
    window.addEventListener("pointerdown", ulang);
    window.addEventListener("keydown", ulang);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", ulang);
      window.removeEventListener("keydown", ulang);
    };
  }, [layar, keAwal]);

  // Layar tablet kiosk tidak boleh mati.
  useEffect(() => {
    if (mode !== "kiosk" || !("wakeLock" in navigator)) return;
    let kunci: WakeLockSentinel | null = null;
    const minta = () =>
      navigator.wakeLock
        .request("screen")
        .then((k) => (kunci = k))
        .catch(() => undefined);
    void minta();
    const saatTerlihat = () => document.visibilityState === "visible" && void minta();
    document.addEventListener("visibilitychange", saatTerlihat);
    return () => {
      document.removeEventListener("visibilitychange", saatTerlihat);
      void kunci?.release().catch(() => undefined);
    };
  }, [mode]);

  async function jalankan(kerja: () => Promise<Hasil<Layar>>, tetapJika: string[] = []): Promise<boolean> {
    setSibuk(true);
    try {
      const h = await kerja();
      if (h.ok) {
        tampilkan(h.data);
        return true;
      }
      if (h.kode && tetapJika.includes(h.kode)) {
        setPesan(h.pesan);
        return false;
      }
      const sesiScanHabis = h.kode === "SESI_BERAKHIR";
      tampilkan({
        layar: "info",
        nada: sesiScanHabis ? "peringatan" : "galat",
        judul: sesiScanHabis ? "Waktu habis" : (JUDUL_GALAT[h.kode ?? ""] ?? "Tidak dapat diproses"),
        pesan: h.pesan,
      });
      return false;
    } catch {
      tampilkan({
        layar: "info",
        nada: "galat",
        judul: "Tidak terhubung",
        pesan: "Kiosk tidak terhubung ke server. Silakan coba lagi atau hubungi petugas.",
      });
      return false;
    } finally {
      setSibuk(false);
      void status.refetch();
    }
  }

  const pindai = (kode: string) => jalankan(() => aksiPindai({ kode, lokasiId }));
  const data = status.data;
  const loker = data?.loker ?? [];
  const terpilih = loker.find((l) => l.id === pilihan && l.status === "KOSONG");
  const memilih = layar.layar === "pilihLoker";

  return (
    <div
      className={cn(
        "flex flex-col",
        mode === "kiosk" ? "min-h-dvh" : "overflow-hidden rounded-lg border-2 border-white/10 bg-white/[0.02]",
      )}
    >
      <header className="flex items-center justify-between gap-4 border-b border-white/10 bg-tembok/85 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="flex min-w-0 items-center gap-5">
          {mode === "kiosk" && <Logo ukuran="sm" className="hidden lg:inline-flex" />}
          <div className={cn("min-w-0", mode === "kiosk" && "lg:border-l-2 lg:border-white/10 lg:pl-5")}>
            <p className="huruf-judul truncate text-lg leading-tight sm:text-xl">{lokasi.nama}</p>
            <p className="text-sm text-kapur/70">
              {data ? (
                <>
                  <span className="font-bold text-limau">{data.jumlah.kosong} loker kosong</span>
                  {" · "}
                  {data.lokasi.sedangBuka
                    ? `buka sampai ${data.lokasi.jamTutup.replace(":", ".")}`
                    : `tutup · peminjaman ${data.lokasi.jamBuka.replace(":", ".")}–${data.lokasi.jamTutup.replace(":", ".")}`}
                </>
              ) : (
                "Memuat status loker…"
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="huruf-stensil text-3xl leading-none font-extrabold sm:text-4xl">
            <Jam zonaWaktu={lokasi.zonaWaktu} />
          </span>
          {mode === "kiosk" && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Layar penuh"
              onClick={() => void document.documentElement.requestFullscreen?.().catch(() => undefined)}
            >
              <MaximizeIcon aria-hidden />
            </Button>
          )}
        </div>
      </header>

      {sesiHabis && (
        <div
          role="alert"
          className="flex items-center justify-center gap-2 border-b-2 border-tinta bg-kuning px-4 py-2 text-sm font-semibold text-tinta"
        >
          <AlertTriangleIcon className="size-4" aria-hidden />
          Sesi perangkat berakhir.
          <Link href="/masuk" className="font-bold underline">
            Masuk lagi
          </Link>
        </div>
      )}
      {offline && (
        <div
          role="alert"
          className="flex items-center justify-center gap-2 border-b-2 border-tinta bg-magenta px-4 py-2 text-sm font-semibold text-tinta"
        >
          <WifiOffIcon className="size-4" aria-hidden />
          Kiosk sedang offline. Silakan hubungi petugas.
        </div>
      )}

      <div className="grid flex-1 gap-5 p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,440px)] lg:items-start">
        <section className="flex flex-col gap-3 max-lg:order-2" aria-label="Denah loker">
          <div className="flex min-h-6 flex-wrap items-center justify-between gap-2">
            <p className="huruf-stensil text-sm font-bold tracking-[0.22em] text-kapur/60 uppercase">Denah loker</p>
            {memilih && (
              <p className="flex items-center gap-1.5 text-sm font-bold text-limau">
                <TitikHidup className="size-2" />
                Ketuk loker hijau untuk memilih.
              </p>
            )}
          </div>
          {data ? (
            <GridLoker
              loker={loker}
              besar
              pilihan={pilihan}
              onPilih={memilih ? (l) => setPilihan(l.id) : undefined}
            />
          ) : (
            <Skeleton className="h-64 w-full" />
          )}
          <LegendaStatus status={mode === "petugas" ? ["KOSONG", "DIPAKAI", "TERLAMBAT", "PERBAIKAN"] : undefined} />
        </section>

        <aside
          className="kertas permukaan-kertas selotip relative mt-2 flex flex-col gap-4 rounded-md border-2 border-tinta p-5 shadow-[6px_6px_0_0_var(--magenta)] max-lg:order-1 sm:p-6"
          aria-live="polite"
        >
          {layar.layar === "awal" &&
            (mode === "kiosk" ? (
              <PanelAwal
                sedangBuka={data?.lokasi.sedangBuka ?? true}
                jamBuka={data?.lokasi.jamBuka}
                jamTutup={data?.lokasi.jamTutup}
                sibuk={sibuk}
                onKamera={pindai}
              />
            ) : (
              <PanelAwalPetugas
                sibuk={sibuk}
                onScan={pindai}
                onCariNomor={(nomor) => jalankan(() => aksiCariNomor({ nomor, lokasiId: lokasi.id }))}
              />
            ))}

          {layar.layar === "registrasi" && (
            <FormRegistrasi
              saran={layar.saran}
              sibuk={sibuk}
              galat={pesan}
              onBatal={keAwal}
              onKirim={(isian) =>
                jalankan(() => aksiRegistrasi({ ...isian, token: layar.token, lokasiId }), ["DATA_TIDAK_VALID"])
              }
            />
          )}

          {layar.layar === "buatPin" && (
            <PanelBuatPin
              key={nomorLayar}
              nama={layar.nama}
              sibuk={sibuk}
              galat={pesan}
              onBatal={keAwal}
              onKirim={(pin) => jalankan(() => aksiBuatPin({ token: layar.token, pin, lokasiId }), ["DATA_TIDAK_VALID"])}
            />
          )}

          {layar.layar === "pilihLoker" && (
            <div className="flex flex-col gap-4">
              <Sapaan profil={layar.profil} />
              {terpilih ? (
                <div
                  key={terpilih.id}
                  className="anim-tempel flex -rotate-1 items-center justify-between gap-4 rounded-md border-2 border-tinta bg-limau px-4 py-3 shadow-[4px_4px_0_0_var(--tinta)]"
                >
                  <div>
                    <p className="text-xs font-bold tracking-[0.12em] uppercase">Loker dipilih</p>
                    <p className="mt-1 text-sm font-semibold">
                      Batas: hari ini {formatJam(layar.profil.batasHariIni, lokasi.zonaWaktu)}
                    </p>
                  </div>
                  <p className="huruf-stensil text-6xl leading-none font-black">{terpilih.kode}</p>
                </div>
              ) : (
                <div className="rounded-md border-2 border-dashed border-tinta/35 p-5 text-center text-sm font-medium text-muted-foreground">
                  Pilih loker hijau pada denah, atau pakai pilih otomatis.
                </div>
              )}
              {pesan && (
                <p role="alert" className="rounded-md border-2 border-tinta bg-magenta px-3 py-2 text-sm font-semibold text-tinta">
                  {pesan}
                </p>
              )}
              <Button
                size="lg"
                className="h-14 text-lg"
                disabled={!terpilih || sibuk}
                onClick={() =>
                  terpilih &&
                  jalankan(() => aksiPinjam({ token: layar.token, lokerId: terpilih.id, lokasiId }), [
                    "LOKER_TIDAK_TERSEDIA",
                  ])
                }
              >
                {sibuk && <LoaderCircleIcon className="animate-spin" aria-hidden />}
                Pinjam loker ini
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12"
                disabled={sibuk}
                onClick={() => jalankan(() => aksiPinjam({ token: layar.token, lokerId: null, lokasiId }))}
              >
                <ShuffleIcon aria-hidden />
                Pilih otomatis
              </Button>
              <Button variant="ghost" onClick={keAwal}>
                Batal
              </Button>
            </div>
          )}

          {layar.layar === "pin" && (
            <div className="flex flex-col gap-4">
              <Sapaan profil={layar.profil} />
              <DaftarPinjaman profil={layar.profil} lokasiId={lokasi.id} zonaWaktu={lokasi.zonaWaktu} />
              <KeypadPin
                key={percobaanPin}
                judul="Masukkan PIN"
                keterangan="PIN diperlukan untuk membuka loker Anda."
                galat={pesan}
                sibuk={sibuk}
                onKirim={async (pin) => {
                  const ok = await jalankan(() => aksiVerifikasiPin({ token: layar.token, pin, lokasiId }), ["PIN_SALAH"]);
                  if (!ok) setPercobaanPin((n) => n + 1);
                }}
              />
              <p className="text-center text-xs font-medium text-muted-foreground">Lupa PIN? Hubungi petugas.</p>
              <Button variant="ghost" onClick={keAwal}>
                Batal
              </Button>
              {mode === "petugas" && (
                <AlatPetugas
                  profil={layar.profil}
                  lokasiId={lokasi.id}
                  onSelesai={(p) => tampilkan({ layar: "info", nada: "sukses", judul: "Berhasil", pesan: p })}
                />
              )}
            </div>
          )}

          {layar.layar === "aksi" && (
            <PanelAksi
              profil={layar.profil}
              lokasiId={lokasi.id}
              zonaWaktu={lokasi.zonaWaktu}
              sibuk={sibuk}
              onBuka={(id) => jalankan(() => aksiBukaUlang({ token: layar.token, peminjamanId: id, lokasiId }))}
              onKembalikan={(id) => jalankan(() => aksiKembalikan({ token: layar.token, peminjamanId: id, lokasiId }))}
              onPinjamLagi={() => tampilkan({ layar: "pilihLoker", token: layar.token, profil: layar.profil })}
              onSelesai={keAwal}
            >
              {mode === "petugas" && (
                <AlatPetugas
                  profil={layar.profil}
                  lokasiId={lokasi.id}
                  onSelesai={(p) => tampilkan({ layar: "info", nada: "sukses", judul: "Berhasil", pesan: p })}
                />
              )}
            </PanelAksi>
          )}

          {layar.layar === "info" && <PanelInfo key={nomorLayar} {...layar} detik={resetDetik} onSelesai={keAwal} />}
        </aside>
      </div>

      {mode === "kiosk" && <PenangkapScanner aktif={layar.layar === "awal" && !sibuk && !sesiHabis} onScan={pindai} />}
    </div>
  );
}

function Jam({ zonaWaktu }: { zonaWaktu: string }) {
  const [kini, setKini] = useState<Date | null>(null);
  useEffect(() => {
    const perbarui = () => setKini(new Date());
    const pertama = window.setTimeout(perbarui, 0);
    const id = window.setInterval(perbarui, 15_000);
    return () => {
      window.clearTimeout(pertama);
      window.clearInterval(id);
    };
  }, []);
  return <span className="tabular-nums">{kini ? formatJam(kini, zonaWaktu) : ""}</span>;
}

function PanelAwal({
  sedangBuka,
  jamBuka,
  jamTutup,
  sibuk,
  onKamera,
}: {
  sedangBuka: boolean;
  jamBuka?: string;
  jamTutup?: string;
  sibuk: boolean;
  onKamera: (kode: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-7 py-6 text-center">
      <KartuPindai sibuk={sibuk} />
      <div className="flex flex-col items-center gap-3">
        <p className="huruf-judul text-[2.6rem] leading-[0.95] text-balance sm:text-5xl">
          <span className="sorot">Scan kartu</span> Anda
        </p>
        <p className="flex items-center gap-1.5 font-medium text-muted-foreground">
          Dekatkan kartu Anda ke scanner di bawah layar.
          <ArrowDownIcon className="size-4 animate-bounce text-tinta" aria-hidden />
        </p>
      </div>
      {!sedangBuka && jamBuka && jamTutup && (
        <p className="rounded-md border-2 border-tinta bg-kuning px-3 py-2 text-sm font-semibold text-tinta">
          Peminjaman baru dilayani pukul {jamBuka.replace(":", ".")}–{jamTutup.replace(":", ".")}. Pengembalian tetap
          bisa.
        </p>
      )}
      <KameraScanner onHasil={onKamera} disabled={sibuk} />
    </div>
  );
}

/** Ilustrasi kartu dengan sinar scanner bergerak naik-turun. */
function KartuPindai({ sibuk }: { sibuk: boolean }) {
  return (
    <div className="relative -rotate-3" aria-hidden>
      <div className="relative h-36 w-56 overflow-hidden rounded-xl border-[3px] border-tinta bg-tinta p-4 text-left shadow-[6px_6px_0_0_var(--limau)]">
        <div className="flex items-start justify-between">
          <span className="block h-7 w-9 rounded-md border-2 border-kuning/80 bg-[linear-gradient(90deg,transparent_45%,rgb(255_210_63/0.7)_45%_55%,transparent_55%),linear-gradient(transparent_45%,rgb(255_210_63/0.7)_45%_55%,transparent_55%)] bg-kuning/25" />
          <span className="huruf-tag text-lg leading-none text-limau">LP</span>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <span className="block h-2 w-32 rounded-full bg-kapur/80" />
          <span className="block h-2 w-20 rounded-full bg-kapur/40" />
          <span className="mt-1 block h-4 w-40 bg-[repeating-linear-gradient(90deg,var(--kapur)_0_2px,transparent_2px_4px,var(--kapur)_4px_5px,transparent_5px_8px)] opacity-70" />
        </div>
        {sibuk ? (
          <span className="absolute inset-0 grid place-items-center bg-tinta/70">
            <LoaderCircleIcon className="size-10 animate-spin text-limau" />
          </span>
        ) : (
          <span className="anim-sinar absolute inset-0">
            <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-limau shadow-[0_0_18px_4px_var(--limau)]" />
          </span>
        )}
      </div>
    </div>
  );
}

function PanelAwalPetugas({
  sibuk,
  onScan,
  onCariNomor,
}: {
  sibuk: boolean;
  onScan: (kode: string) => void;
  onCariNomor: (nomor: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem("kode") as HTMLInputElement;
          const kode = input.value.trim();
          input.value = "";
          if (kode) onScan(kode);
        }}
      >
        <Label htmlFor="kode-scan">Scan kartu</Label>
        <div className="flex gap-2">
          <Input id="kode-scan" name="kode" autoFocus autoComplete="off" placeholder="Arahkan scanner ke sini" />
          <Button type="submit" disabled={sibuk}>
            Proses
          </Button>
        </div>
      </form>
      <form
        className="flex flex-col gap-2 border-t-2 border-dashed border-border pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          const nomor = (e.currentTarget.elements.namedItem("nomor") as HTMLInputElement).value.trim();
          if (nomor) onCariNomor(nomor);
        }}
      >
        <Label htmlFor="nomor-manual">Kartu rusak/tertinggal? Cari dengan nomor ID</Label>
        <div className="flex gap-2">
          <Input id="nomor-manual" name="nomor" autoComplete="off" placeholder="Nomor ID anggota" />
          <Button type="submit" variant="outline" disabled={sibuk}>
            <SearchIcon aria-hidden />
            Cari
          </Button>
        </div>
      </form>
      <KameraScanner onHasil={onScan} disabled={sibuk} />
    </div>
  );
}

function Sapaan({ profil }: { profil: ProfilKiosk }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="huruf-judul grid size-12 shrink-0 -rotate-6 place-items-center rounded-md border-2 border-tinta bg-limau text-xl shadow-[3px_3px_0_0_var(--tinta)]"
        aria-hidden
      >
        {profil.nama.trim().charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0">
        <p className="huruf-judul text-xl leading-tight break-words">Halo, {profil.nama}</p>
        <p className="text-sm font-semibold text-muted-foreground tabular-nums">ID {profil.nomorSamar}</p>
      </div>
    </div>
  );
}

function DaftarPinjaman({ profil, lokasiId, zonaWaktu }: { profil: ProfilKiosk; lokasiId: string; zonaWaktu: string }) {
  const acuan = new Date(profil.batasHariIni);
  const diSini = profil.pinjamanAktif.filter((p) => p.lokasiId === lokasiId);
  return (
    <ul className="flex flex-col gap-1.5 text-sm">
      {diSini.map((p) => (
        <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-md bg-muted px-3 py-2 font-medium">
          Loker <span className="huruf-stensil text-lg leading-none font-extrabold">{p.lokerKode}</span> · batas{" "}
          {formatWaktuSingkat(p.batasAt, acuan, zonaWaktu)}
          {p.terlambat && <Badge variant="destructive">Terlambat</Badge>}
        </li>
      ))}
    </ul>
  );
}

function PanelBuatPin({
  nama,
  sibuk,
  galat,
  onKirim,
  onBatal,
}: {
  nama: string;
  sibuk: boolean;
  galat: string | null;
  onKirim: (pin: string) => void;
  onBatal: () => void;
}) {
  const [pinPertama, setPinPertama] = useState<string | null>(null);
  const [tidakSama, setTidakSama] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      {pinPertama === null ? (
        <KeypadPin
          key="pertama"
          judul={`Halo, ${nama}`}
          keterangan="Buat PIN 4–6 angka. PIN dipakai saat membuka loker yang Anda pinjam."
          labelKirim="Lanjut"
          galat={tidakSama ? "PIN tidak sama. Silakan buat ulang." : galat}
          onKirim={(pin) => {
            setTidakSama(false);
            setPinPertama(pin);
          }}
        />
      ) : (
        <KeypadPin
          key="kedua"
          judul="Ulangi PIN"
          keterangan="Masukkan PIN yang sama sekali lagi."
          labelKirim="Simpan"
          sibuk={sibuk}
          onKirim={(pin) => {
            if (pin !== pinPertama) {
              setTidakSama(true);
              setPinPertama(null);
              return;
            }
            onKirim(pin);
          }}
        />
      )}
      <Button variant="ghost" onClick={onBatal}>
        Batal
      </Button>
    </div>
  );
}

function PanelAksi({
  profil,
  lokasiId,
  zonaWaktu,
  sibuk,
  onBuka,
  onKembalikan,
  onPinjamLagi,
  onSelesai,
  children,
}: {
  profil: ProfilKiosk;
  lokasiId: string;
  zonaWaktu: string;
  sibuk: boolean;
  onBuka: (peminjamanId: string) => void;
  onKembalikan: (peminjamanId: string) => void;
  onPinjamLagi: () => void;
  onSelesai: () => void;
  children?: React.ReactNode;
}) {
  const acuan = new Date(profil.batasHariIni);
  const diSini = profil.pinjamanAktif.filter((p) => p.lokasiId === lokasiId);
  const lain = profil.pinjamanAktif.filter((p) => p.lokasiId !== lokasiId);
  return (
    <div className="flex flex-col gap-4">
      <Sapaan profil={profil} />
      {diSini.map((p) => (
        <div
          key={p.id}
          className="flex flex-col gap-3 rounded-md border-2 border-tinta bg-background p-4 shadow-[4px_4px_0_0_var(--tinta)]"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">Loker Anda</p>
              <p className="huruf-stensil text-6xl leading-none font-black">{p.lokerKode}</p>
            </div>
            {p.terlambat && <Badge variant="destructive">Terlambat</Badge>}
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Sejak {formatWaktuSingkat(p.mulaiAt, acuan, zonaWaktu)} · batas {formatWaktuSingkat(p.batasAt, acuan, zonaWaktu)}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="outline" size="lg" className="h-14" disabled={sibuk} onClick={() => onBuka(p.id)}>
              Buka saja
            </Button>
            <Button size="lg" className="h-14 whitespace-normal leading-tight" disabled={sibuk} onClick={() => onKembalikan(p.id)}>
              Selesai & kembalikan
            </Button>
          </div>
        </div>
      ))}
      {lain.length > 0 && (
        <p className="text-sm font-medium text-muted-foreground">
          Anda juga meminjam: {lain.map((p) => `${p.lokerKode} (${p.lokasiNama})`).join(", ")}.
        </p>
      )}
      {profil.bolehPinjamLagi && (
        <Button variant="outline" onClick={onPinjamLagi} disabled={sibuk}>
          Pinjam loker lain
        </Button>
      )}
      <Button variant="ghost" onClick={onSelesai}>
        Selesai
      </Button>
      {children}
    </div>
  );
}

/** Kode seperti "A-01" tidak boleh terpotong di tanda hubung; teksnya sendiri tidak diubah. */
function TeksUtuh({ teks }: { teks: string }) {
  return teks
    .split(/(\s+)/)
    .map((bagian, i) => (/\S-\S/.test(bagian) ? <span key={i} className="whitespace-nowrap">{bagian}</span> : bagian));
}

function PanelInfo({
  nada,
  judul,
  pesan,
  detail,
  detik,
  onSelesai,
}: Extract<Layar, { layar: "info" }> & { detik: number; onSelesai: () => void }) {
  const [sisa, setSisa] = useState(detik);
  useEffect(() => {
    const habis = window.setTimeout(onSelesai, detik * 1000);
    const hitung = window.setInterval(() => setSisa((s) => Math.max(0, s - 1)), 1000);
    return () => {
      window.clearTimeout(habis);
      window.clearInterval(hitung);
    };
  }, [detik, onSelesai]);

  const Ikon = nada === "sukses" ? CheckCircle2Icon : nada === "peringatan" ? AlertTriangleIcon : XCircleIcon;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6 text-center">
      <span
        className={cn(
          "anim-tempel grid size-24 -rotate-6 place-items-center rounded-full border-[3px] border-tinta text-tinta shadow-[5px_5px_0_0_var(--tinta)]",
          nada === "sukses" && "bg-limau",
          nada === "peringatan" && "bg-kuning",
          nada === "galat" && "bg-magenta",
        )}
        aria-hidden
      >
        <Ikon className="size-12" strokeWidth={2.5} />
      </span>
      <p className="huruf-judul text-3xl leading-tight text-balance sm:text-4xl">
        <TeksUtuh teks={judul} />
      </p>
      <p className="text-lg font-medium text-pretty">
        <TeksUtuh teks={pesan} />
      </p>
      {detail && <p className="text-muted-foreground">{detail}</p>}
      <div className="flex w-full max-w-xs flex-col gap-2 pt-2">
        <Button size="lg" className="h-14 text-lg" onClick={onSelesai}>
          OK
        </Button>
        <div className="h-1.5 overflow-hidden rounded-full bg-tinta/15" aria-hidden>
          <div
            className="h-full origin-left bg-tinta transition-[scale] duration-1000 ease-linear"
            style={{ scale: `${sisa / detik} 1` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">Kembali ke layar awal dalam {sisa} detik</p>
      </div>
    </div>
  );
}
