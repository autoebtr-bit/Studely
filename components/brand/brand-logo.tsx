import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { BRAND } from "@/lib/marketing/content";

interface BrandLogoProps {
  href?: string;
  /** `dark` pour un fond sombre (sidebar, pied de page). */
  tone?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const MARK_SIZE = { sm: "size-8", md: "size-9", lg: "size-10" } as const;
const TEXT_SIZE = { sm: "text-lg", md: "text-2xl", lg: "text-2xl" } as const;
const ICON_SIZE = { sm: "size-4", md: "size-5", lg: "size-5" } as const;

/** Logo Studely : étoile en dégradé + nom, avec le point d'accent. */
export function BrandLogo({
  href = "/",
  tone = "light",
  size = "md",
  className,
}: BrandLogoProps) {
  const content = (
    <>
      <span
        className={cn(
          "grid place-items-center rounded-xl gradient-sunset text-white shadow-md shadow-brand-500/25",
          "transition-transform duration-200 group-hover:scale-105 group-hover:rotate-3",
          MARK_SIZE[size],
        )}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className={ICON_SIZE[size]} aria-hidden>
          <path d="M12 2L13.8 8.2L20 10L13.8 11.8L12 18L10.2 11.8L4 10L10.2 8.2L12 2Z" />
        </svg>
      </span>
      <span
        className={cn(
          "font-extrabold tracking-tight",
          TEXT_SIZE[size],
          tone === "dark" ? "text-white" : "text-slate-900",
        )}
      >
        {BRAND.name}
        <span className="text-brand-500">.</span>
      </span>
    </>
  );

  return (
    <Link
      href={href}
      aria-label={`${BRAND.name} — accueil`}
      className={cn("group flex items-center gap-2.5", className)}
    >
      {content}
    </Link>
  );
}
