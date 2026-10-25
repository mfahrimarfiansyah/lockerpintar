"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

/** Notifikasi = stiker yang "ditempel" di atas layar: limau (sukses), magenta (galat), kertas (info). */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--kertas)",
          "--normal-text": "var(--tinta)",
          "--normal-border": "var(--tinta)",
          "--border-radius": "6px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast border-2! border-tinta! font-sans! text-sm! font-semibold! shadow-[4px_4px_0_0_var(--tinta)]!",
          success: "bg-limau! text-tinta!",
          error: "bg-magenta! text-tinta!",
          warning: "bg-kuning! text-tinta!",
          description: "text-tinta/80! font-medium!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
