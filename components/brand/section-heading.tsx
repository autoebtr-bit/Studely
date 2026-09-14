import { Eyebrow } from "./eyebrow";
import { cn } from "@/lib/utils/cn";

interface SectionHeadingProps {
  eyebrow?: string;
  eyebrowTone?: "brand" | "accent" | "neutral";
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "center" | "left";
  /** Largeur maximale du bloc de texte. */
  width?: "narrow" | "wide";
  className?: string;
}

/**
 * En-tête de section : étiquette, titre, sous-titre.
 *
 * Toutes les sections de la landing passent par ce composant, ce qui garantit
 * un rythme typographique et des espacements identiques d'un bloc à l'autre.
 *
 * `data-reveal` fait apparaître l'en-tête à l'arrivée à l'écran — le point
 * d'accroche est ici pour que chaque section en hérite sans le redemander. Il
 * est inerte partout où le script de `app/(marketing)/layout.tsx` n'est pas
 * chargé, donc sans effet dans l'application.
 */
export function SectionHeading({
  eyebrow,
  eyebrowTone = "brand",
  title,
  description,
  align = "center",
  width = "narrow",
  className,
}: SectionHeadingProps) {
  return (
    <div
      data-reveal
      className={cn(
        width === "narrow" ? "max-w-2xl" : "max-w-3xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className,
      )}
    >
      {eyebrow && <Eyebrow tone={eyebrowTone}>{eyebrow}</Eyebrow>}

      <h2
        className={cn(
          "mt-4 text-3xl font-extrabold tracking-tight text-slate-950",
          "sm:text-4xl",
        )}
      >
        {title}
      </h2>

      {description && (
        <p className="mt-3 text-base leading-relaxed text-slate-600 sm:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}
