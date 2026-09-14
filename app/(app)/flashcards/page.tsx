import type { Metadata } from "next";
import Link from "next/link";
import { Layers, Sparkles, Play } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { readSubjects, readDueFlashcardCount } from "@/lib/data/courses";

export const metadata: Metadata = { title: "Flashcards" };

export default async function FlashcardsPage() {
  const [subjects, TOTAL_DUE_FLASHCARDS] = await Promise.all([
    readSubjects(),
    readDueFlashcardCount(),
  ]);

  const chaptersWithCards = subjects
    .flatMap((s) => s.chapters.map((c) => ({ ...c, subjectName: s.name, emoji: s.emoji })))
    .filter((c) => c.dueFlashcards > 0);

  const aucunChapitre = subjects.every((s) => s.chapters.length === 0);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Questions de cours"
        description="Répétition espacée : chaque carte revient juste avant que tu ne l'oublies."
      />

      {aucunChapitre && (
        <EmptyState
          icon={Layers}
          title="Aucune question de cours à réviser"
          description="Les questions se créent à partir de tes chapitres, et à partir de ce que tu rates en khôlle blanche. Commence par l'un ou l'autre."
          action={{ label: "Passer une khôlle", href: "/kholle" }}
          secondary={{ label: "Importer un cours", href: "/importer" }}
          className="mb-7"
        />
      )}

      {/* Bandeau de révision globale */}
      <Card className="mb-7 overflow-hidden">
        <div className="flex flex-wrap items-center gap-4 bg-gradient-to-br from-brand-600 to-accent-500 p-6 text-white">
          <span className="grid size-12 shrink-0 place-items-center rounded-card bg-white/20">
            <Layers className="size-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-semibold tabular-nums">
              {TOTAL_DUE_FLASHCARDS} cartes
            </p>
            <p className="text-sm text-white/75">
              à revoir aujourd&apos;hui, tous chapitres confondus
            </p>
          </div>
          {TOTAL_DUE_FLASHCARDS > 0 && (
            <Link href="/flashcards/session/toutes">
              <Button variant="dark" className="bg-white text-brand-700 hover:bg-white/90">
                <Play />
                Tout réviser
              </Button>
            </Link>
          )}
        </div>
      </Card>

      <h2 className="mb-3 text-sm font-semibold text-slate-900">Par chapitre</h2>

      {chaptersWithCards.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-3xl" aria-hidden>
            🎉
          </p>
          <p className="mt-3 font-medium text-slate-900">Tout est à jour</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">
            Aucune carte à revoir pour l&apos;instant. Reviens demain, ou génère de
            nouvelles cartes depuis un chapitre.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {chaptersWithCards.map((chapter) => (
            <Card key={chapter.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-lg" aria-hidden>
                  {chapter.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {chapter.title}
                  </p>
                  <p className="text-xs text-slate-500">{chapter.subjectName}</p>
                </div>
                <Badge variant="brand">{chapter.dueFlashcards}</Badge>
              </div>

              <Progress
                value={chapter.progressPct}
                className="mt-3 h-1.5"
                label={`Maîtrise de ${chapter.title}`}
              />

              <Link
                href={`/flashcards/session/${chapter.id}`}
                className="mt-3 block"
              >
                <Button size="sm" variant="outline" className="w-full">
                  Réviser ce chapitre
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-6 flex flex-wrap items-center gap-4 p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-tile bg-brand-100 text-brand-600">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900">
            Générer des cartes depuis un cours
          </p>
          <p className="text-xs text-slate-500">
            Les énoncés et démonstrations d&apos;un chapitre deviennent des cartes
            recto-verso, à réciter plutôt qu&apos;à relire.
          </p>
        </div>
        <Link href="/cours">
          <Button size="sm">Choisir un chapitre</Button>
        </Link>
      </Card>
    </div>
  );
}
