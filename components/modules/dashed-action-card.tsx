import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface DashedActionCardProps {
  href: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  className?: string;
}

/** Carte à bordure pointillée du bas de grille : Importer, Parrainer (capture 3). */
export function DashedActionCard({
  href,
  title,
  subtitle,
  icon: Icon,
  className,
}: DashedActionCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed",
        "border-brand-300/60 bg-white/50 px-4 py-7 text-center transition-colors",
        "hover:border-brand-400 hover:bg-brand-50/70",
        className,
      )}
    >
      <span
        className="grid size-10 place-items-center rounded-tile bg-brand-100 text-brand-600
                   transition-transform group-hover:scale-105"
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="text-sm font-semibold text-slate-900">{title}</span>
      <span className="-mt-1.5 text-xs text-slate-500">{subtitle}</span>
    </Link>
  );
}
