import { cn } from "@/lib/utils/cn";

/** Grille responsive des pavés de module : 1 / 2 / 3 colonnes. */
export function ModuleGrid({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3", className)}
      {...props}
    />
  );
}
