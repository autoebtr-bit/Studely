import type { Metadata } from "next";
import { Flame, Layers, Trophy, Zap } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { XpBar } from "@/components/gamification/xp-bar";
import { XpChart } from "@/components/gamification/xp-chart";
import { KholleProgress } from "@/components/kholle/kholle-progress";
import { readKholleHistory } from "@/lib/kholle/read-history";
import { readProfile } from "@/lib/data/profile";
import { readSubjects, readDueFlashcardCount } from "@/lib/data/courses";
import { readAchievements, readXpHistory } from "@/lib/data/gamification";
import { levelProgress } from "@/lib/xp/level";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Progression" };

export default async function ProgressionPage() {
  // Vide tant qu'aucune khôlle n'a été notée — l'état de tout nouveau compte.
  const [history, profile, subjects, dueFlashcards, achievements, xpHistory] =
    await Promise.all([
      readKholleHistory(),
      readProfile(),
      readSubjects(),
      readDueFlashcardCount(),
      readAchievements(),
      readXpHistory(),
    ]);

  const chapters = subjects.flatMap((s) => s.chapters);
  const p = levelProgress(profile?.xpTotal ?? 0);
  const xpThisWeek = xpHistory.slice(-7).reduce((s, x) => s + x, 0);

  // Une division par zéro donnerait NaN : sans chapitre, la maîtrise est nulle.
  const avgMastery = chapters.length
    ? Math.round(
        chapters.reduce((s, c) => s + c.progressPct, 0) / chapters.length,
      )
    : 0;

  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Progression"
        description="Ce que tes khôlles disent de toi, critère par critère."
      />

      {/* En tête, et pas les badges : ce sont les oraux qui prouvent le progrès. */}
      <KholleProgress history={history} />

      <Card className="mt-4 p-6">
        <XpBar xpTotal={profile?.xpTotal ?? 0} />
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={<Zap className="size-4" />}
          value={xpThisWeek}
          label="XP cette semaine"
        />
        <StatTile
          icon={<Flame className="size-4" />}
          value={profile?.streakCurrent ?? 0}
          label={`Série (record ${profile?.streakBest ?? 0})`}
        />
        <StatTile
          icon={<Layers className="size-4" />}
          value={dueFlashcards}
          label="Cartes à revoir"
        />
        <StatTile
          icon={<Trophy className="size-4" />}
          value={`${avgMastery}%`}
          label="Maîtrise moyenne"
        />
      </div>

      <Card className="mt-4 p-6">
        <h2 className="text-sm font-semibold text-slate-900">
          XP des 30 derniers jours
        </h2>
        <XpChart values={xpHistory} className="mt-4" />
      </Card>

      <Card className="mt-4 p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Badges</h2>
          <p className="text-xs tabular-nums text-slate-500">
            {unlocked} / {achievements.length} débloqués
          </p>
        </div>

        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {achievements.map((achievement) => (
            <li
              key={achievement.code}
              className={cn(
                "rounded-card border p-4 text-center transition-colors",
                achievement.unlocked
                  ? "border-brand-200 bg-brand-50"
                  : "border-cream-200 bg-white opacity-55",
              )}
            >
              <span
                className={cn("text-2xl", !achievement.unlocked && "grayscale")}
                aria-hidden
              >
                {achievement.emoji}
              </span>
              <p className="mt-1.5 text-sm font-medium text-slate-900">
                {achievement.title}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-slate-500">
                {achievement.description}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-4 p-6">
        <h2 className="text-sm font-semibold text-slate-900">
          Maîtrise par chapitre
        </h2>
        <ul className="mt-4 space-y-3">
          {[...chapters]
            .sort((a, b) => a.progressPct - b.progressPct)
            .map((chapter) => (
              <li key={chapter.id} className="flex items-center gap-3">
                <span className="w-44 shrink-0 truncate text-sm text-slate-800">
                  {chapter.title}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-pill bg-cream-200">
                  <div
                    className="h-full rounded-pill bg-gradient-to-r from-brand-500 to-accent-500"
                    style={{ width: `${chapter.progressPct}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-slate-500">
                  {chapter.progressPct}%
                </span>
              </li>
            ))}
        </ul>
      </Card>

      <p className="mt-6 text-center text-xs text-slate-400">
        Niveau {p.level} · {p.title} — encore{" "}
        {p.xpForNextLevel === null ? 0 : p.xpForNextLevel - p.xpIntoLevel} XP avant
        le niveau suivant.
      </p>
    </div>
  );
}

function StatTile({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <Card className="p-4">
      <span className="flex items-center gap-1.5 text-brand-600">{icon}</span>
      <p className="mt-1.5 text-xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className="text-xs leading-snug text-slate-500">{label}</p>
    </Card>
  );
}
