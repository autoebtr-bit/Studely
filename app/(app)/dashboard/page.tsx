import type { Metadata } from "next";
import { Flame, Layers, Target, Zap } from "lucide-react";
import { NextKholle } from "@/components/dashboard/next-kholle";
import { StatTile } from "@/components/dashboard/stat-tile";
import { ModuleCard } from "@/components/modules/module-card";
import { ModuleGrid } from "@/components/modules/module-grid";
import { SectionLabel } from "@/components/modules/section-label";
import { DashedActionCard } from "@/components/modules/dashed-action-card";
import {
  MODULES,
  QUICK_ACTIONS,
  SECTION_LABELS,
  SECTION_ORDER,
  modulesBySection,
} from "@/lib/modules/registry";
import { FirstKholle } from "@/components/dashboard/first-kholle";
import { readProfile } from "@/lib/data/profile";
import { readDueFlashcardCount } from "@/lib/data/courses";
import { readDashboardStats } from "@/lib/data/dashboard";

export const metadata: Metadata = { title: "Tableau de bord" };

const featured = MODULES.find((m) => m.section === "featured");

export default async function DashboardPage() {
  const [profile, stats, dueFlashcards] = await Promise.all([
    readProfile(),
    readDashboardStats(),
    readDueFlashcardCount(),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      {/*
        `NextKholle` suppose une khôlle programmée, une matière et un programme
        de colleur. Tant que l'élève n'en a passé aucune, il n'y a rien de vrai
        à y mettre : on affiche le bandeau de démarrage à la place.
      */}
      {stats.kholleCount === 0 ? (
        <FirstKholle credits={stats.kholleCredits} />
      ) : (
        <NextKholle
          subject="Ta prochaine khôlle"
          when="quand tu veux"
          daysLeft={0}
          programme="Entre le programme annoncé par ton colleur pour lancer une nouvelle khôlle blanche."
          readiness={0}
          masteredCount={0}
          totalCount={0}
        />
      )}

      {/* Indicateurs */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={<Layers className="size-5" />}
          value={dueFlashcards}
          label="questions à revoir"
          href="/flashcards"
          tone="brand"
        />
        <StatTile
          icon={<Target className="size-5" />}
          value={stats.chaptersInProgress}
          label="chapitres en cours"
          href="/cours"
          tone="accent"
        />
        <StatTile
          icon={<Flame className="size-5" />}
          value={profile?.streakCurrent ?? 0}
          label="jours d'affilée"
          href="/progression"
          tone="amber"
        />
        <StatTile
          icon={<Zap className="size-5" />}
          value={stats.xpThisWeek}
          label="XP cette semaine"
          href="/progression"
          tone="emerald"
        />
      </div>

      {/* Module mis en avant */}
      {featured && (
        <div className="mt-7">
          <ModuleCard module={featured} featured />
        </div>
      )}

      {/* Ce qui sert à préparer la khôlle */}
      {SECTION_ORDER.map((section) => {
        const items = modulesBySection(section);
        if (items.length === 0) return null;

        return (
          <section key={section} className="mt-7">
            <SectionLabel>{SECTION_LABELS[section]}</SectionLabel>
            <ModuleGrid>
              {items.map((mod) => (
                <ModuleCard key={mod.slug} module={mod} />
              ))}
            </ModuleGrid>
          </section>
        );
      })}

      <div className="mt-7 grid gap-3.5">
        {QUICK_ACTIONS.map((action) => (
          <DashedActionCard
            key={action.slug}
            href={`/${action.slug}`}
            title={action.title}
            subtitle={action.subtitle}
            icon={action.icon}
          />
        ))}
      </div>
    </div>
  );
}
