import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

/**
 * Bouton de l'application.
 *
 * Il partage l'identité de la landing : la variante principale porte le
 * dégradé sunset et les mêmes réactions au survol et au clic.
 * Pour les appels à l'action de la landing, préférer `GradientButton`, qui
 * ajoute l'onde au point de clic.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold " +
    "transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "cta-gradient gradient-sunset-pan text-white shadow-lift hover:shadow-glow",
        dark: "bg-ink-900 text-white hover:bg-ink-800 active:scale-[0.98]",
        outline:
          "border border-cream-300 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-slate-900 active:scale-[0.98]",
        ghost: "text-slate-600 hover:bg-cream-100 hover:text-slate-900",
        subtle: "bg-brand-50 text-brand-700 hover:bg-brand-100",
        danger: "bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]",
      },
      size: {
        sm: "h-9 rounded-pill px-3.5 text-sm [&_svg]:size-4",
        md: "h-11 rounded-pill px-5 text-sm [&_svg]:size-4",
        lg: "h-12 rounded-pill px-7 text-base [&_svg]:size-5",
        icon: "size-10 rounded-full [&_svg]:size-5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
