import { cn } from "@/lib/utils/cn";

type EyebrowTone = "brand" | "accent" | "neutral";

const TONES: Record<EyebrowTone, string> = {
  brand: "text-brand-600 bg-brand-50 border-brand-100",
  accent: "text-accent-600 bg-accent-50 border-accent-100",
  neutral: "text-slate-600 bg-cream-200/60 border-cream-300",
};

interface EyebrowProps {
  children: React.ReactNode;
  tone?: EyebrowTone;
  className?: string;
}

/** Étiquette de section en petites majuscules, au-dessus d'un titre. */
export function Eyebrow({ children, tone = "brand", className }: EyebrowProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-pill border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
