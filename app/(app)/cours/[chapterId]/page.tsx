import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Clock,
  Headphones,
  Layers,
  Mic,
  PenLine,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { readChapter, readLessons } from "@/lib/data/courses";
import { readPodcastByChapter } from "@/lib/data/study";
import { cn } from "@/lib/utils/cn";
import { GenerateBar } from "./generate-bar";

interface PageProps {
  params: { chapterId: string };
}

// Les chapitres appartiennent à chaque élève : aucune liste n'est connue à la
// compilation, la page est donc rendue à la demande.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const found = await readChapter(params.chapterId);
  return { title: found?.chapter.title ?? "Chapitre introuvable" };
}

export default async function ChapterPage({ params }: PageProps) {
  const found = await readChapter(params.chapterId);
  if (!found) notFound();

  const { chapter, subject } = found;
  const [lessons, podcast] = await Promise.all([
    readLessons(chapter.id),
    readPodcastByChapter(chapter.id),
  ]);
  const totalMinutes = lessons.reduce((s, l) => s + l.readingMinutes, 0);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/cours"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-brand-600"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {subject?.name ?? "Mes cours"}
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {chapter.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden />
            {totalMinutes} min de lecture
          </span>
          <span>·</span>
          <span>{lessons.length} leçons</span>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Progress
            value={chapter.progressPct}
            label={`Progression du chapitre ${chapter.title}`}
          />
          <span className="shrink-0 text-sm font-medium tabular-nums text-slate-900">
            {chapter.progressPct}%
          </span>
        </div>
      </header>

      {/* Raccourcis vers les modules, contextualisés sur ce chapitre */}
      <div className="mb-7 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <ChapterAction
          href={`/flashcards/session/${chapter.id}`}
          icon={<Layers className="size-4" />}
          label="Flashcards"
          hint={chapter.dueFlashcards > 0 ? `${chapter.dueFlashcards} à revoir` : "À jour"}
          highlight={chapter.dueFlashcards > 0}
        />
        <ChapterAction
          href={`/exercices?chapitre=${chapter.id}`}
          icon={<PenLine className="size-4" />}
          label="Exercices"
          hint="S'entraîner"
        />
        <ChapterAction
          href={`/kholle?chapitre=${chapter.id}`}
          icon={<Mic className="size-4" />}
          label="Khôlle blanche"
          hint="Passer l'épreuve"
        />
        <ChapterAction
          href={`/podcast/${chapter.id}`}
          icon={<Headphones className="size-4" />}
          label="Podcast"
          hint="Écouter"
        />
      </div>

      {/* Produire fiches, exercices et podcast : c'est ici, et nulle part
          ailleurs, que ces trois modules trouvent leur point de départ. */}
      {lessons.length > 0 && (
        <GenerateBar chapterId={chapter.id} hasPodcast={podcast !== null} />
      )}

      <h2 className="mb-3 text-sm font-semibold text-slate-900">Leçons</h2>
      {lessons.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-slate-600">
            Aucune leçon pour l&apos;instant dans ce chapitre.
          </p>
          <Link href="/importer" className="mt-4 inline-block">
            <Button size="sm">Importer un document</Button>
          </Link>
        </Card>
      ) : (
        <ol className="space-y-2.5">
          {lessons.map((lesson, i) => (
            <li key={lesson.id}>
              <Card className="flex items-start gap-3.5 p-4 transition-shadow hover:shadow-lift">
                <span
                  className={cn(
                    "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
                    lesson.completed
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-cream-100 text-slate-500",
                  )}
                  aria-hidden
                >
                  {lesson.completed ? <Check className="size-3.5" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-slate-900">{lesson.title}</h3>
                    {lesson.completed && (
                      <Badge variant="success">Terminée</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{lesson.summary}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {lesson.readingMinutes} min
                  </p>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ChapterAction({
  href,
  icon,
  label,
  hint,
  highlight = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col gap-1 rounded-card border p-3 transition-colors",
        highlight
          ? "border-brand-300 bg-brand-50 hover:bg-brand-100"
          : "border-cream-200 bg-white hover:border-brand-200 hover:bg-brand-50/50",
      )}
    >
      <span className="flex items-center gap-1.5 text-brand-600">{icon}</span>
      <span className="text-sm font-medium text-slate-900">{label}</span>
      <span className="text-[11px] text-slate-500">{hint}</span>
    </Link>
  );
}
