"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { GradientButton } from "@/components/ui/gradient-button";
import { NAV_LINKS } from "@/lib/marketing/content";
import { cn } from "@/lib/utils/cn";

/**
 * En-tête de la landing.
 *
 * Trois comportements travaillés :
 *  - au défilement, la barre se compacte et son ombre apparaît ;
 *  - le lien de la section visible est mis en avant (observateur d'intersection) ;
 *  - sous `md`, la pilule de navigation devient un panneau plein écran.
 *
 * La navigation reste la même partout : seul son contenant change de forme.
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>(NAV_LINKS[0].href);

  // Compactage au défilement.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Section courante : on observe les ancres plutôt que de calculer des
  // positions à chaque frame, bien moins coûteux.
  useEffect(() => {
    const sections = NAV_LINKS.map((l) =>
      document.querySelector<HTMLElement>(l.href),
    ).filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(`#${visible.target.id}`);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  // Le panneau mobile fige le défilement de la page derrière lui.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Échap ferme le panneau : un panneau plein écran doit toujours être
  // refermable sans viser une cible.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 border-b transition-all duration-300",
          scrolled
            ? "border-cream-200/80 bg-cream-50/90 shadow-sm backdrop-blur-md"
            : "border-transparent bg-cream-50/70 backdrop-blur-sm",
        )}
      >
        <div
          className={cn(
            "section-shell flex items-center justify-between transition-all duration-300",
            scrolled ? "h-16" : "h-20",
          )}
        >
          <BrandLogo size={scrolled ? "sm" : "md"} />

          {/* Navigation en pilule — desktop */}
          <nav
            aria-label="Navigation principale"
            className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-pill border border-cream-200 bg-white/70 px-3 py-1.5 shadow-sm backdrop-blur md:flex"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                data-active={active === link.href}
                aria-current={active === link.href ? "true" : undefined}
                className={cn(
                  "nav-underline rounded-pill px-4 py-1.5 text-sm transition-colors",
                  active === link.href
                    ? "font-semibold text-slate-900"
                    : "font-medium text-slate-600 hover:bg-cream-100 hover:text-slate-900",
                )}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="hidden px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:text-brand-600 sm:inline-flex"
            >
              Connexion
            </Link>

            <GradientButton href="/signup" size="sm" className="hidden sm:inline-flex">
              Commencer
            </GradientButton>

            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Ouvrir le menu"
              aria-expanded={open}
              aria-controls="menu-mobile"
              className="grid size-10 place-items-center rounded-pill border border-cream-200 bg-white text-slate-800 transition-colors hover:border-brand-300 md:hidden"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Panneau de navigation mobile */}
      <div
        id="menu-mobile"
        hidden={!open}
        className="fixed inset-0 z-[60] md:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setOpen(false)}
          className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        />

        <div className="absolute inset-x-0 top-0 animate-fade-up rounded-b-card border-b border-cream-200 bg-cream-50 p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <BrandLogo size="sm" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer le menu"
              className="grid size-10 place-items-center rounded-pill border border-cream-200 bg-white text-slate-800"
            >
              <X className="size-5" />
            </button>
          </div>

          <nav aria-label="Navigation mobile" className="mt-6 flex flex-col gap-1">
            {NAV_LINKS.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                style={{ animationDelay: `${i * 45}ms` }}
                className={cn(
                  "animate-fade-up rounded-tile px-4 py-3 text-base font-semibold transition-colors",
                  active === link.href
                    ? "bg-white text-brand-600 shadow-sm"
                    : "text-slate-700 hover:bg-white",
                )}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="mt-6 flex flex-col gap-2.5">
            <GradientButton href="/signup" size="lg" full onClick={() => setOpen(false)}>
              Commencer gratuitement
            </GradientButton>
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-pill border border-cream-300 bg-white py-3 text-center text-sm font-semibold text-slate-700"
            >
              J&apos;ai déjà un compte
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
