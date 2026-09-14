import { cn } from "@/lib/utils/cn";

interface SectionLabelProps {
  children: React.ReactNode;
  /** Petit ornement affiché après le libellé (🌐, 🎮 …). */
  ornament?: string;
  className?: string;
}

/** Libellé de section en petites majuscules espacées (capture 3). */
export function SectionLabel({ children, ornament, className }: SectionLabelProps) {
  return (
    <h2
      className={cn(
        "mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400",
        className,
      )}
    >
      {children}
      {ornament && (
        <span aria-hidden className="text-sm leading-none">
          {ornament}
        </span>
      )}
    </h2>
  );
}
