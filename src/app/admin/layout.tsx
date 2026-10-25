import { Suspense } from "react";
import { Navigasi } from "@/components/admin/navigasi";
import { Skeleton } from "@/components/ui/skeleton";
import { wajibPeran } from "@/lib/sesi";

export default function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <Suspense fallback={<KerangkaNavigasi />}>
        <MenuPengguna />
      </Suspense>
      <main className="flex min-w-0 flex-1 flex-col gap-6 px-4 pt-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}

async function MenuPengguna() {
  const pengguna = await wajibPeran("ADMIN", "PETUGAS");
  return <Navigasi nama={pengguna.nama} peran={pengguna.peran as "ADMIN" | "PETUGAS"} />;
}

function KerangkaNavigasi() {
  return (
    <>
      <div className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-2 border-r border-white/10 px-3 pt-5 lg:flex">
        <Skeleton className="mb-6 h-10 w-44" />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
      <div className="flex h-16 items-center border-b border-white/10 px-4 lg:hidden">
        <Skeleton className="h-9 w-40" />
      </div>
    </>
  );
}
