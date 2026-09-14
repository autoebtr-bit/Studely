"use client";

import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

/**
 * Bouton d'action principal de la marque.
 *
 * Trois états travaillés :
 *  - repos  : dégradé sunset, ombre colorée ;
 *  - survol : le dégradé défile, le bouton se soulève, un voile clair passe ;
 *  - clic   : enfoncement franc + onde émise au point exact du clic.
 *
 * L'onde est calculée ici plutôt qu'en CSS pur car elle doit partir de la
 * position du curseur — un pseudo-élément statique donnerait un effet mou et
 * toujours centré.
 */

const gradientButtonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill font-bold " +
    "transition-all disabled:pointer-events-none disabled:opacity-60 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        /** Dégradé plein : l'action que l'on veut voir cliquée. */
        sunset:
          "cta-gradient gradient-sunset-pan text-white shadow-lift hover:shadow-glow",
        /** Blanc sur fond coloré, pour les sections en dégradé. */
        light:
          "cta-gradient bg-white text-slate-950 shadow-lg hover:shadow-xl",
        /** Contour discret : action secondaire. */
        outline:
          "cta-gradient border border-cream-300 bg-white text-slate-700 shadow-sm hover:border-brand-300 hover:text-slate-900",
      },
      size: {
        sm: "h-10 px-5 text-sm [&_svg]:size-4",
        md: "h-12 px-7 text-sm [&_svg]:size-5",
        lg: "h-14 px-8 text-base [&_svg]:size-5",
      },
      full: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: { tone: "sunset", size: "md", full: false },
  },
);

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

type BaseProps = VariantProps<typeof gradientButtonVariants> & {
  children: React.ReactNode;
  className?: string;
  /** Rendu en lien Next quand renseigné, en bouton sinon. */
  href?: string;
};

type GradientButtonProps = BaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps>;

export function GradientButton({
  children,
  className,
  tone,
  size,
  full,
  href,
  onClick,
  ...rest
}: GradientButtonProps) {
  const [ripples, setRipples] = React.useState<Ripple[]>([]);
  const nextId = React.useRef(0);

  const spawnRipple = React.useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      const target = event.currentTarget;
      const rect = target.getBoundingClientRect();
      // Un cercle qui couvre le bouton depuis n'importe quel point de départ.
      const size = Math.max(rect.width, rect.height);
      const ripple: Ripple = {
        id: nextId.current++,
        x: event.clientX - rect.left - size / 2,
        y: event.clientY - rect.top - size / 2,
        size,
      };

      setRipples((prev) => [...prev, ripple]);
      // Nettoyage après l'animation : sans cela les nœuds s'accumulent.
      window.setTimeout(
        () => setRipples((prev) => prev.filter((r) => r.id !== ripple.id)),
        600,
      );
    },
    [],
  );

  const classes = cn(gradientButtonVariants({ tone, size, full }), className);

  const rippleLayer = (
    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-pill">
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          aria-hidden
          className="absolute animate-ripple rounded-full bg-white/50"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
          }}
        />
      ))}
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        onClick={(e) => {
          spawnRipple(e);
          onClick?.(e as unknown as React.MouseEvent<HTMLButtonElement>);
        }}
      >
        {rippleLayer}
        <span className="relative flex items-center gap-2">{children}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      onClick={(e) => {
        spawnRipple(e);
        onClick?.(e);
      }}
      {...rest}
    >
      {rippleLayer}
      <span className="relative flex items-center gap-2">{children}</span>
    </button>
  );
}
