import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StatTileProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  href?: string;
  /** Teinte de la pastille d'icône. */
  tone?: "brand" | "accent" | "amber" | "emerald";
  className?: string;
}

const TONES = {
  brand: "bg-brand-50 text-brand-600",
  accent: "bg-accent-50 text-accent-600",
  amber: "bg-amber-50 text-amber-600",
  emerald: "bg-emerald-50 text-emerald-600",
} as const;

/** Tuile d'indicateur. Devient un lien quand `href` est fourni. */
export function StatTile({
  icon,
  value,
  label,
  href,
  tone = "brand",
  className,
}: StatTileProps) {
  const body = (
    <>
      <span
        className={cn(
          "grid size-10 place-items-center rounded-tile transition-transform group-hover:scale-105",
          TONES[tone],
        )}
      >
        {icon}
      </span>

      <p className="mt-3 text-2xl font-extrabold tabular-nums text-slate-900">
        {value}
      </p>
      <p className="text-xs leading-snug text-slate-500">{label}</p>

      {href && (
        <ArrowUpRight
          aria-hidden
          className="absolute right-4 top-4 size-4 text-slate-300 transition-all group-hover:right-3.5 group-hover:top-3.5 group-hover:text-brand-500"
        />
      )}
    </>
  );

  const classes = cn(
    "group relative rounded-card border border-cream-200 bg-white p-4",
    href && "hover-lift hover:border-brand-200 hover:shadow-card",
    className,
  );

  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
