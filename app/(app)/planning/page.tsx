import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { readProfile } from "@/lib/data/profile";
import { readSubjects } from "@/lib/data/courses";
import { readStudySessions } from "@/lib/data/study";
import { daysUntil, formatDateLong } from "@/lib/utils/date";
import { PlanningBoard } from "./planning-board";
import { PlanGenerator } from "./plan-generator";

export const metadata: Metadata = { title: "Planning" };

// Le planning change dès qu'une séance est cochée ou regénérée.
export const dynamic = "force-dynamic";

export default async function PlanningPage() {
  const [profile, sessions, subjects] = await Promise.all([
    readProfile(),
    readStudySessions(),
    readSubjects(),
  ]);

  const chapters = subjects.flatMap((s) =>
    s.chapters.map((c) => ({ id: c.id, title: c.title, subjectName: s.name })),
  );

  const examDate = profile?.examDate ?? null;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Planning"
        description="Ton programme de révision jusqu'au jour de l'examen."
      />

      {/* Le compte à rebours n'a de sens qu'avec une date : sans elle, on
          invite à la renseigner plutôt que d'afficher un J−0 trompeur. */}
      {examDate ? (
        <Card className="mb-6 flex flex-wrap items-center gap-4 bg-gradient-to-br from-accent-600 to-brand-500 p-5 text-white">
          <span className="grid size-11 shrink-0 place-items-center rounded-card bg-white/20">
            <CalendarDays className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-semibold tabular-nums">
              J−{daysUntil(examDate)}
            </p>
            <p className="text-sm text-white/75">
              Examen le {formatDateLong(examDate)}
            </p>
          </div>
        </Card>
      ) : null}

      {/* Sans chapitre, la route refuse : l'élève doit d'abord importer un
          cours, et lui montrer un bouton qui échouera ne l'aide pas. */}
      {chapters.length > 0 && (
        <PlanGenerator examDate={examDate} hasSessions={sessions.length > 0} />
      )}

      {sessions.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Aucune séance planifiée"
          description="Le planning répartit tes chapitres jusqu'au concours et fait revenir en priorité ceux que tu maîtrises le moins. Il se construit à partir de tes cours."
          action={{ label: "Importer un cours", href: "/importer" }}
        />
      ) : (
        <PlanningBoard sessions={sessions} chapters={chapters} />
      )}
    </div>
  );
}
