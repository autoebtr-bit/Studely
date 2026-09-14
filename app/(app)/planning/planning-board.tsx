"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Check, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  SESSION_TYPE_LABELS,
  type AppStudySession,
} from "@/lib/data/types";
import { XP_RULES } from "@/lib/xp/rules";
import { cn } from "@/lib/utils/cn";
import { setSessionDone } from "./actions";

/** Chapitre tel que le tableau a besoin de le nommer. */
export interface PlanningChapter {
  id: string;
  title: string;
  subjectName: string;
}

/** Regroupe les séances par jour et rend chaque jour cochable. */
export function PlanningBoard({
  sessions,
  chapters = [],
}: {
  sessions: AppStudySession[];
  /** Passés en propriété plutôt que lus par le composant : il reste client. */
  chapters?: PlanningChapter[];
}) {
  const [done, setDone] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sessions.map((s) => [s.id, s.done])),
  );
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => {
    const map = new Map<number, AppStudySession[]>();
    for (const session of sessions) {
      const bucket = map.get(session.dayOffset) ?? [];
      bucket.push(session);
      map.set(session.dayOffset, bucket);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [sessions]);

  const completed = Object.values(done).filter(Boolean).length;
  const totalMinutes = sessions.reduce((s, x) => s + x.durationMin, 0);

  /**
   * Coche la séance tout de suite, puis l'enregistre.
   *
   * L'affichage passe en premier : attendre l'aller-retour serveur rendrait la
   * case molle, alors que cocher une séance faite est un geste de satisfaction.
   * En cas d'échec on revient exactement à l'état précédent — mieux vaut une
   * case qui se décoche devant l'élève qu'une validation qu'il croit acquise.
   */
  async function toggle(id: string) {
    const next = !done[id];
    setDone((prev) => ({ ...prev, [id]: next }));
    setError(null);

    const result = await setSessionDone({ sessionId: id, done: next });

    if (!result.ok) {
      setDone((prev) => ({ ...prev, [id]: !next }));
      setError(result.error ?? "La séance n'a pas pu être enregistrée.");
    }
  }

  return (
    <>
      <Card className="mb-5 p-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium text-slate-900">
            {completed} / {sessions.length} séances validées
          </span>
          <span className="tabular-nums text-slate-500">
            {Math.round(totalMinutes / 60)} h planifiées
          </span>
        </div>
        <Progress
          value={(completed / Math.max(1, sessions.length)) * 100}
          className="mt-2.5"
          label="Séances validées"
        />

        {error && (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 text-sm text-red-600"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}
      </Card>

      <div className="space-y-5">
        {days.map(([offset, items]) => (
          <section key={offset}>
            <h2 className="mb-2 text-sm font-semibold text-slate-900">
              {dayLabel(offset)}
            </h2>

            <div className="space-y-2">
              {items.map((session) => {
                const chapter = chapters.find((c) => c.id === session.chapterId);
                const subject = chapter ? { name: chapter.subjectName } : undefined;
                const isDone = done[session.id] ?? false;

                return (
                  <Card
                    key={session.id}
                    className={cn(
                      "flex items-center gap-3.5 p-4 transition-opacity",
                      isDone && "opacity-60",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => void toggle(session.id)}
                      aria-pressed={isDone}
                      aria-label={`Marquer « ${chapter?.title ?? "séance"} » comme ${isDone ? "non faite" : "faite"}`}
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors",
                        isDone
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-black/15 hover:border-brand-400",
                      )}
                    >
                      {isDone && <Check className="size-3.5" aria-hidden />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm font-medium text-slate-900",
                          isDone && "line-through",
                        )}
                      >
                        {chapter?.title ?? "Séance"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {subject?.name} · {SESSION_TYPE_LABELS[session.type]}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium tabular-nums text-slate-900">
                        {session.startTime}
                      </p>
                      <p className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="size-3" aria-hidden />
                        {session.durationMin} min
                      </p>
                    </div>

                    {isDone && (
                      <Badge variant="success" className="shrink-0">
                        +{XP_RULES.plan_session_completed.base} XP
                      </Badge>
                    )}
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function dayLabel(offset: number): string {
  if (offset === 0) return "Aujourd'hui";
  if (offset === 1) return "Demain";

  const date = new Date();
  date.setDate(date.getDate() + offset);
  const formatted = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
