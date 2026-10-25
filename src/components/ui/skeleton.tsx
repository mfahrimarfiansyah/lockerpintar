import { cn } from "cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted bg-[repeating-linear-gradient(-45deg,transparent_0_10px,rgb(255_255_255/0.025)_10px_20px)]", className)}
      {...props}
    />
  )
}

export { Skeleton }
