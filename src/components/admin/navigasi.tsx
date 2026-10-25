"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRightIcon,
  ClipboardListIcon,
  CpuIcon,
  IdCardIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  MenuIcon,
  ScanLineIcon,
  SettingsIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { TombolKeluar } from "@/components/form-masuk";
import { Logo } from "@/components/grafiti";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Menu = { href: string; label: string; pendek: string; ikon: LucideIcon; admin: boolean };

const MENU: Menu[] = [
  { href: "/admin", label: "Dashboard", pendek: "Dashboard", ikon: LayoutDashboardIcon, admin: false },
  { href: "/admin/scan", label: "Scan petugas", pendek: "Scan", ikon: ScanLineIcon, admin: false },
  { href: "/admin/peminjaman", label: "Peminjaman", pendek: "Pinjam", ikon: ClipboardListIcon, admin: false },
  { href: "/admin/anggota", label: "Anggota", pendek: "Anggota", ikon: IdCardIcon, admin: false },
  { href: "/admin/lokasi", label: "Lokasi & loker", pendek: "Lokasi", ikon: MapPinIcon, admin: true },
  { href: "/admin/pengguna", label: "Pengguna", pendek: "Pengguna", ikon: UsersIcon, admin: true },
  { href: "/admin/pengaturan", label: "Pengaturan", pendek: "Atur", ikon: SettingsIcon, admin: true },
  { href: "/admin/simulator", label: "Simulator kunci", pendek: "Simulator", ikon: CpuIcon, admin: true },
];

type Props = { nama: string; peran: "ADMIN" | "PETUGAS" };

function aktifUntuk(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

/** Dua gaya navigasi: sidebar tembok di desktop (≥ 1024 px), top bar + tab bar bawah di mobile. */
export function Navigasi({ nama, peran }: Props) {
  const pathname = usePathname();
  const utama = MENU.filter((m) => !m.admin);
  const kelola = MENU.filter((m) => m.admin && peran === "ADMIN");
  return (
    <>
      <SidebarDesktop pathname={pathname} utama={utama} kelola={kelola} nama={nama} peran={peran} />
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-white/10 bg-tembok/85 px-4 backdrop-blur-md sm:px-6 lg:hidden">
        <Link href="/admin" aria-label="LockerPintar, ke dashboard" className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/60">
          <Logo ukuran="sm" />
        </Link>
        <span className="rounded-[3px] border-[1.5px] border-kapur/40 px-2 py-0.5 text-[0.6875rem] font-bold tracking-[0.08em] uppercase">
          {peran === "ADMIN" ? "Admin" : "Petugas"}
        </span>
      </header>
      <TabBawah pathname={pathname} utama={utama} kelola={kelola} nama={nama} peran={peran} />
    </>
  );
}

type PropsBagian = Props & { pathname: string; utama: Menu[]; kelola: Menu[] };

function SidebarDesktop({ pathname, utama, kelola, nama, peran }: PropsBagian) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-white/10 bg-black/20 lg:flex">
      <Link
        href="/admin"
        aria-label="LockerPintar, ke dashboard"
        className="mx-3 mt-5 mb-8 w-fit rounded-md px-2 py-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
      >
        <Logo ukuran="sm" />
      </Link>
      <nav aria-label="Menu admin" className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 pb-4">
        {utama.map((m) => (
          <ItemSidebar key={m.href} menu={m} aktif={aktifUntuk(pathname, m.href)} />
        ))}
        {kelola.length > 0 && (
          <>
            <p className="huruf-stensil mt-5 mb-1 flex items-center gap-2 px-3 text-xs font-bold tracking-[0.22em] text-kapur/50 uppercase">
              Pengelolaan
              <span className="h-px flex-1 bg-white/10" aria-hidden />
            </p>
            {kelola.map((m) => (
              <ItemSidebar key={m.href} menu={m} aktif={aktifUntuk(pathname, m.href)} />
            ))}
          </>
        )}
      </nav>
      <KartuPengguna nama={nama} peran={peran} className="m-3" />
    </aside>
  );
}

function ItemSidebar({ menu, aktif }: { menu: Menu; aktif: boolean }) {
  const Ikon = menu.ikon;
  return (
    <Link
      href={menu.href}
      aria-current={aktif ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md border-2 px-3 py-2.5 text-sm font-semibold transition-[background-color,border-color,color,rotate] duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
        aktif
          ? "-rotate-1 border-tinta bg-limau text-tinta shadow-[3px_3px_0_0_var(--magenta)]"
          : "border-transparent text-kapur/75 hover:border-white/10 hover:bg-white/5 hover:text-kapur",
      )}
    >
      <Ikon className="size-[18px]" aria-hidden />
      {menu.label}
    </Link>
  );
}

function KartuPengguna({ nama, peran, className }: { nama: string; peran: Props["peran"]; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3", className)}>
      <div className="flex items-center gap-3">
        <span
          className="huruf-judul grid size-10 shrink-0 rotate-3 place-items-center rounded-md border-2 border-tinta bg-sian text-tinta"
          aria-hidden
        >
          {nama.trim().charAt(0).toUpperCase()}
        </span>
        <p className="min-w-0 text-sm">
          <span className="block truncate font-bold">{nama}</span>
          <span className="block text-xs text-muted-foreground">{peran === "ADMIN" ? "Admin" : "Petugas"}</span>
        </p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-1 rounded-sm text-xs font-semibold text-kapur/70 outline-none hover:text-limau focus-visible:ring-3 focus-visible:ring-ring/60"
        >
          Halaman publik <ArrowUpRightIcon className="size-3.5" aria-hidden />
        </Link>
        <TombolKeluar varian="outline" className="h-8 px-3 text-xs" />
      </div>
    </div>
  );
}

function TabBawah({ pathname, utama, kelola, nama, peran }: PropsBagian) {
  const [buka, setBuka] = useState(false);
  const lainnyaAktif = kelola.some((m) => aktifUntuk(pathname, m.href));
  return (
    <nav
      aria-label="Menu admin"
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-white/10 bg-tembok/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto flex max-w-xl items-stretch justify-around px-1">
        {utama.map((m) => (
          <li key={m.href} className="flex-1">
            <ItemTab menu={m} aktif={aktifUntuk(pathname, m.href)} />
          </li>
        ))}
        <li className="flex-1">
          <Dialog open={buka} onOpenChange={setBuka}>
            <DialogTrigger asChild>
              <button type="button" className="group w-full outline-none">
                <TampilanTab ikon={MenuIcon} label="Lainnya" aktif={lainnyaAktif} />
              </button>
            </DialogTrigger>
            <DialogContent className="top-auto bottom-0 left-0 w-full max-w-none translate-x-0 translate-y-0 rounded-t-xl rounded-b-none border-b-0 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-10px_40px_rgb(0_0_0/0.6)] sm:max-w-none data-open:slide-in-from-bottom-10">
              <DialogTitle>Menu lainnya</DialogTitle>
              <DialogDescription className="sr-only">Pengelolaan, halaman publik, dan keluar.</DialogDescription>
              {kelola.length > 0 && (
                <ul className="grid grid-cols-2 gap-2.5">
                  {kelola.map((m) => {
                    const aktif = aktifUntuk(pathname, m.href);
                    const Ikon = m.ikon;
                    return (
                      <li key={m.href}>
                        <Link
                          href={m.href}
                          aria-current={aktif ? "page" : undefined}
                          onClick={() => setBuka(false)}
                          className={cn(
                            "flex h-full items-center gap-2.5 rounded-md border-2 border-tinta px-3 py-3 text-sm font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
                            aktif ? "bg-limau shadow-[3px_3px_0_0_var(--tinta)]" : "bg-background hover:bg-muted",
                          )}
                        >
                          <Ikon className="size-5 shrink-0" aria-hidden />
                          {m.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="flex items-center justify-between gap-3 rounded-md bg-muted p-3">
                <p className="min-w-0 text-sm">
                  <span className="block truncate font-bold">{nama}</span>
                  <span className="block text-xs text-muted-foreground">{peran === "ADMIN" ? "Admin" : "Petugas"}</span>
                </p>
                <TombolKeluar varian="outline" />
              </div>
              <Link
                href="/"
                target="_blank"
                onClick={() => setBuka(false)}
                className="flex items-center justify-center gap-1.5 text-sm font-semibold underline decoration-limau decoration-2 underline-offset-4"
              >
                Buka halaman publik <ArrowUpRightIcon className="size-4" aria-hidden />
              </Link>
            </DialogContent>
          </Dialog>
        </li>
      </ul>
    </nav>
  );
}

function ItemTab({ menu, aktif }: { menu: Menu; aktif: boolean }) {
  return (
    <Link href={menu.href} aria-current={aktif ? "page" : undefined} className="group block outline-none">
      <TampilanTab ikon={menu.ikon} label={menu.pendek} aktif={aktif} />
    </Link>
  );
}

function TampilanTab({ ikon: Ikon, label, aktif }: { ikon: LucideIcon; label: string; aktif: boolean }) {
  return (
    <span className="flex flex-col items-center gap-1 pt-2 pb-1.5">
      <span
        className={cn(
          "grid h-8 w-12 place-items-center rounded-md border-2 transition-[background-color,border-color,rotate] duration-150 group-focus-visible:ring-3 group-focus-visible:ring-ring/60",
          aktif
            ? "-rotate-3 border-tinta bg-limau text-tinta shadow-[2px_2px_0_0_var(--magenta)]"
            : "border-transparent text-kapur/70 group-hover:text-kapur",
        )}
      >
        <Ikon className="size-5" aria-hidden />
      </span>
      <span className={cn("text-[0.6875rem] font-bold", aktif ? "text-limau" : "text-kapur/70")}>{label}</span>
    </span>
  );
}
