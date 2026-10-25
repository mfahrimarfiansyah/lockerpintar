import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// Tombol stiker: tepi tebal + bayangan 3D (magenta di tembok, tinta di kertas), "ditekan" saat diklik.
const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center rounded-md border-2 font-semibold whitespace-nowrap transition-[translate,box-shadow,background-color,color,border-color,filter] duration-150 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/60 active:not-aria-[haspopup]:translate-x-[2px] active:not-aria-[haspopup]:translate-y-[2px] active:not-aria-[haspopup]:shadow-none disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-tinta bg-primary text-primary-foreground shadow-[3px_3px_0_0_var(--bayang)] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_0_var(--bayang)]",
        outline:
          "border-tepi bg-background text-foreground shadow-[2px_2px_0_0_var(--bayang-lembut)] hover:border-foreground hover:bg-muted aria-expanded:bg-muted",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:brightness-110",
        ghost: "border-transparent text-foreground hover:bg-muted aria-expanded:bg-muted",
        destructive:
          "border-tinta bg-destructive text-destructive-foreground shadow-[3px_3px_0_0_var(--bayang-lembut)] hover:brightness-110",
        link: "border-transparent text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:decoration-[3px]",
      },
      size: {
        default: "h-10 gap-2 px-4 text-sm",
        xs: "h-7 gap-1 rounded-sm px-2 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1.5 px-3 text-[0.8125rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-5 text-base",
        icon: "size-10",
        "icon-xs": "size-7 rounded-sm [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
