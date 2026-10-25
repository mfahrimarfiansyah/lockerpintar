"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function FormMasuk() {
  const router = useRouter();
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);

  async function kirim(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSibuk(true);
    setGalat(null);
    const { data, error } = await authClient.signIn.email({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });
    if (error) {
      setSibuk(false);
      setGalat(
        error.status === 429
          ? "Terlalu banyak percobaan. Tunggu satu menit lalu coba lagi."
          : error.code === "INVALID_EMAIL_OR_PASSWORD"
            ? "Email atau password salah."
            : "Gagal masuk. Akun mungkin nonaktif; hubungi admin.",
      );
      return;
    }
    const peran = (data?.user as { peran?: string } | undefined)?.peran;
    router.replace(peran === "KIOSK" ? "/kiosk" : "/admin");
    router.refresh();
  }

  return (
    <form onSubmit={kirim} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {galat && (
        <p role="alert" className="rounded-md border-2 border-tinta bg-magenta px-3 py-2 text-sm font-semibold text-tinta">
          {galat}
        </p>
      )}
      <Button type="submit" size="lg" className="mt-1" disabled={sibuk}>
        {sibuk && <LoaderCircleIcon className="animate-spin" aria-hidden />}
        Masuk
      </Button>
    </form>
  );
}

export function TombolKeluar({ className, varian = "outline" }: { className?: string; varian?: "outline" | "ghost" }) {
  const router = useRouter();
  const [sibuk, setSibuk] = useState(false);
  return (
    <Button
      type="button"
      variant={varian}
      className={className}
      disabled={sibuk}
      onClick={async () => {
        setSibuk(true);
        await authClient.signOut();
        router.replace("/masuk");
        router.refresh();
      }}
    >
      Keluar
    </Button>
  );
}
