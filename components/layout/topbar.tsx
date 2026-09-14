"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Menu, Search, X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { StreakFlame } from "@/components/gamification/streak-flame";
import { LevelBadge } from "@/components/gamification/level-badge";
import { levelProgress } from "@/lib/xp/level";
import { cn } from "@/lib/utils/cn";

interface TopbarProps {
  user: { fullName: string; xpTotal: number; streakCurrent: number };
  counters?: { dueFlashcards?: number };
}

/** Barre supérieure : menu mobile, recherche, série, niveau, notifications. */
export function Topbar({ user, counters }: TopbarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const p = levelProgress(user.xpTotal);

  // Le tiroir fige la page derrière lui et se ferme avec Échap.
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-cream-200/70 bg-cream-50/85 px-4 backdrop-blur-md lg:px-8">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Ouvrir le menu"
          aria-expanded={drawerOpen}
          className="grid size-10 shrink-0 place-items-center rounded-pill border border-cream-200 bg-white text-slate-800 transition-colors hover:border-brand-300 lg:hidden"
        >
          <Menu className="size-5" />
        </button>

        {/*
          `min-w-0` : sans lui, cet élément flex garde `min-width: auto`, refuse
          de rétrécir sous la largeur de son texte, et pousse les actions de
          droite hors de l'écran sur mobile.
        */}
        <Link
          href="/recherche"
          className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-pill border border-cream-200 bg-white px-4 text-sm text-slate-400 transition-colors hover:border-brand-300 sm:max-w-sm"
        >
          <Search className="size-4 shrink-0" aria-hidden />
          <span className="truncate">Rechercher un cours, un module…</span>
        </Link>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <StreakFlame days={user.streakCurrent} className="hidden sm:inline-flex" />

          <Link
            href="/progression"
            className="flex items-center gap-2 rounded-pill border border-cream-200 bg-white py-1 pl-1 pr-3 transition-colors hover:border-brand-300"
            aria-label={`Niveau ${p.level}, ${p.title}`}
          >
            <LevelBadge level={p.level} size="sm" />
            <span className="hidden text-xs font-semibold text-slate-700 sm:block">
              {p.title}
            </span>
          </Link>

          <button
            type="button"
            aria-label="Notifications"
            className="relative grid size-10 place-items-center rounded-pill border border-cream-200 bg-white text-slate-700 transition-colors hover:border-brand-300"
          >
            <Bell className="size-5" />
            <span
              aria-hidden
              className="absolute right-2.5 top-2.5 size-2 animate-halo-pulse rounded-full bg-brand-500 ring-2 ring-white"
            />
          </button>
        </div>
      </header>

      {/* Tiroir de navigation mobile */}
      <div hidden={!drawerOpen} className="fixed inset-0 z-50 lg:hidden">
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setDrawerOpen(false)}
          className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"
        />

        <div className={cn("absolute inset-y-0 left-0 animate-fade-up")}>
          <Sidebar
            user={user}
            counters={counters}
            onNavigate={() => setDrawerOpen(false)}
          />
        </div>

        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label="Fermer le menu"
          className="absolute right-4 top-4 grid size-10 place-items-center rounded-pill bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
        >
          <X className="size-5" />
        </button>
      </div>
    </>
  );
}
