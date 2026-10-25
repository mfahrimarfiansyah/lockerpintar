import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// Badge = stiker kecil berhuruf kapital.
const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-[3px] border-[1.5px] px-2 text-[0.6875rem] font-bold tracking-[0.06em] whitespace-nowrap uppercase transition-all focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "border-tinta bg-primary text-primary-foreground [a]:hover:brightness-105",
        secondary: "border-transparent bg-secondary text-secondary-foreground [a]:hover:brightness-110",
        destructive: "border-tinta bg-magenta text-tinta [a]:hover:brightness-105",
        outline: "border-current bg-transparent text-foreground [a]:hover:bg-muted",
        ghost: "border-transparent hover:bg-muted",
        link: "border-transparent text-foreground underline underline-offset-4",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
