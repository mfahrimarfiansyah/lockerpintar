"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: ReactNode }) {
  const [klien] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 2_000, refetchOnWindowFocus: true } } }),
  );
  return (
    <QueryClientProvider client={klien}>
      {children}
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
