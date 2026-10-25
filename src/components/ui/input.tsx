import * as React from "react"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-md border-2 border-input bg-background px-3 py-1.5 text-base text-foreground transition-[box-shadow,border-color] outline-none file:mr-3 file:inline-flex file:h-7 file:cursor-pointer file:rounded-sm file:border-0 file:bg-tinta file:px-2.5 file:text-xs file:font-semibold file:text-kertas placeholder:text-muted-foreground/80 focus-visible:shadow-[3px_3px_0_0_var(--ring)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive read-only:bg-muted md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
