"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LogOut } from "lucide-react";
import { NAV_GROUPS } from "./sidebar-nav";
import { BrandLogo } from "@/components/brand/brand-logo";
import { levelProgress } from "@/lib/xp/level";
import { cn } from "@/lib/utils/cn";

interface SidebarProps {
  user: { fullName: string; xpTotal: number };
  counters?: { dueFlashcards?: number };
  /** Ferme le tiroir sur mobile après un clic. */
  onNavigate?: () => void;
  className?: string;
}

/**
 * Navigation latérale de l'application.
 *
 * Format repris de la maquette de référence : marque en haut, carte
 * utilisateur, groupes de liens, action de sortie détachée en bas. L'habillage
 * est celui de la landing — même dégradé, même famille typographique — pour que
 * l'application et le site public ne semblent pas venir de deux produits.
 */
export function Sidebar({ user, counters, onNavigate, className }: SidebarProps) {
  const pathname = usePathname();
  const p = levelProgress(user.xpTotal);

  return (
    <nav
      aria-label="Navigation principale"
      className={cn(
        "flex h-full w-[264px] shrink-0 flex-col bg-ink-900 text-white",
        className,
      )}
    >
      <div className="px-5 py-6">
        <BrandLogo tone="dark" size="md" />
      </div>

      {/* Carte utilisateur */}
      <Link
        href="/progression"
        onClick={onNavigate}
        className="glass-card-dark mx-3 flex items-center gap-3 rounded-tile p-3 transition-colors hover:bg-white/[0.12]"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full gradient-sunset text-sm font-bold">
          {initials(user.fullName)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">
            {user.fullName}
          </span>
          <span className="block truncate text-xs text-white/50">
            Niveau {p.level} · {p.title}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-white/40" aria-hidden />
      </Link>

      {/* Barre d'XP compacte */}
      <div className="mx-3 mt-3">
        <div className="h-1.5 overflow-hidden rounded-pill bg-white/10">
          <div
            className="h-full rounded-pill gradient-sunset transition-[width] duration-500"
            style={{ width: `${p.pct}%` }}
          />
        </div>
        <p className="mt-1.5 text-[10px] font-medium tabular-nums text-white/45">
          {p.xpForNextLevel === null
            ? "Niveau maximum"
            : `${p.xpForNextLevel - p.xpIntoLevel} XP avant le niveau ${p.level + 1}`}
        </p>
      </div>

      {/* Liens */}
      <div className="scrollbar-slim mt-5 flex-1 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label ?? `g${gi}`} className={cn(gi > 0 && "mt-6")}>
            {group.label && (
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
                {group.label}
              </p>
            )}

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                const badge =
                  item.badgeKey === "dueFlashcards"
                    ? counters?.dueFlashcards
                    : undefined;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-tile px-3 py-2.5 text-sm transition-all",
                        active
                          ? "gradient-sunset font-semibold text-white shadow-lift"
                          : "text-white/60 hover:bg-white/[0.08] hover:text-white",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-[18px] shrink-0 transition-transform",
                          !active && "group-hover:scale-110",
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>

                      {badge != null && badge > 0 && (
                        <span
                          className={cn(
                            "shrink-0 rounded-pill px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                            active ? "bg-white/25" : "bg-brand-500 text-white",
                          )}
                        >
                          {badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 p-3">
        <Link
          href="/login"
          onClick={onNavigate}
          className="flex items-center justify-between rounded-tile bg-white/[0.06] px-4 py-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.12] hover:text-white"
        >
          <span className="flex items-center gap-3">
            <LogOut className="size-[18px]" aria-hidden />
            Déconnexion
          </span>
          <ChevronRight className="size-4 opacity-50" aria-hidden />
        </Link>
      </div>
    </nav>
  );
}

/** Initiales d'un nom complet, pour l'avatar de repli. */
function initials(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
