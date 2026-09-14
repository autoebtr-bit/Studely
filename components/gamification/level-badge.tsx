import { cn } from "@/lib/utils/cn";

interface LevelBadgeProps {
  level: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** Pastille de niveau, en dégradé de marque. */
export function LevelBadge({ level, size = "md", className }: LevelBadgeProps) {
  return (
    <span
      aria-label={`Niveau ${level}`}
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500",
        "font-bold tabular-nums text-white ring-2 ring-white/25",
        size === "sm" && "size-7 text-[11px]",
        size === "md" && "size-9 text-xs",
        size === "lg" && "size-14 text-lg",
        className,
      )}
    >
      {level}
    </span>
  );
}
