import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ChevronRight, Plus, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { readSubjects } from "@/lib/data/courses";

export const metadata: Metadata = { title: "Mes cours" };

export default async function CoursPage() {
  const subjects = await readSubjects();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Mes cours"
        description="Tes matières, chapitre par chapitre."
        actions={
          <>
            <Link href="/importer">
              <Button variant="outline" size="sm">
                <Upload />
                Importer
              </Button>
            </Link>
            <Button size="sm">
              <Plus />
              Nouvelle matière
            </Button>
          </>
        }
      />

      {subjects.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="Aucun cours pour l'instant"
          description="Importe un cours en PDF ou en photo, et il sera découpé en chapitres. Tu n'en as pas besoin pour passer une khôlle : le programme peut aussi se taper à la main."
          action={{ label: "Importer un cours", href: "/importer" }}
          secondary={{ label: "Passer une khôlle", href: "/kholle" }}
        />
      )}

      <div className="space-y-5">
        {subjects.map((subject) => {
          const avg = Math.round(
            subject.chapters.reduce((s, c) => s + c.progressPct, 0) /
              Math.max(1, subject.chapters.length),
          );

          return (
            <Card key={subject.id} className="overflow-hidden">
              <div className="flex items-center gap-3 border-b border-cream-200 p-4">
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-tile text-lg"
                  style={{ backgroundColor: `${subject.color}1A` }}
                  aria-hidden
                >
                  {subject.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold text-slate-900">
                    {subject.name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {subject.chapters.length} chapitre
                    {subject.chapters.length > 1 ? "s" : ""} · {avg}% maîtrisé
                  </p>
                </div>
                <div className="hidden w-32 sm:block">
                  <Progress value={avg} label={`Progression en ${subject.name}`} />
                </div>
              </div>

              <ul className="divide-y divide-cream-200">
                {subject.chapters.map((chapter) => (
                  <li key={chapter.id}>
                    <Link
                      href={`/cours/${chapter.id}`}
                      className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-brand-50/60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {chapter.title}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Progress
                            value={chapter.progressPct}
                            className="h-1.5 max-w-[180px]"
                            label={`Progression : ${chapter.title}`}
                          />
                          <span className="text-[11px] tabular-nums text-slate-400">
                            {chapter.progressPct}%
                          </span>
                        </div>
                      </div>

                      {chapter.dueFlashcards > 0 && (
                        <Badge variant="brand" className="shrink-0">
                          {chapter.dueFlashcards} à revoir
                        </Badge>
                      )}

                      <ChevronRight
                        className="size-4 shrink-0 text-slate-300"
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
