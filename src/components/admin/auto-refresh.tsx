"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Memperbarui data halaman server secara berkala (dashboard live). */
export function AutoRefresh({ detik = 5 }: { detik?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, detik * 1000);
    return () => window.clearInterval(id);
  }, [router, detik]);
  return null;
}
