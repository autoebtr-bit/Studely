import type { Metadata } from "next";
import Link from "next/link";
import { Headphones, Play } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { readPodcasts } from "@/lib/data/study";
import { readSubjects } from "@/lib/data/courses";

export const metadata: Metadata = { title: "Podcast" };

function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  return `${m} min`;
}

export default async function PodcastPage() {
  const [podcasts, subjects] = await Promise.all([
    readPodcasts(),
    readSubjects(),
  ]);

  const chapters = subjects.flatMap((s) =>
    s.chapters.map((c) => ({ ...c, subjectName: s.name })),
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Podcast"
        description="Tes chapitres transformés en révision audio. Idéal dans les transports."
      />

      {podcasts.length === 0 && (
        <EmptyState
          icon={Headphones}
          title="Aucun podcast pour l'instant"
          description="Choisis un chapitre importé, et il sera transformé en révision audio à écouter dans les transports."
          action={{ label: "Voir mes cours", href: "/cours" }}
        />
      )}

      <div className="space-y-3">
        {podcasts.map((podcast) => {
          const chapter = chapters.find((c) => c.id === podcast.chapterId);
          const subject = chapter ? { name: chapter.subjectName } : undefined;

          return (
            <Card key={podcast.id} className="flex items-center gap-4 p-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-card bg-gradient-to-br from-brand-600 to-accent-500 text-white">
                <Headphones className="size-5" aria-hidden />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">{podcast.title}</p>
                <p className="text-xs text-slate-500">
                  {subject?.name ?? "—"} · {formatDuration(podcast.durationEstS)} ·{" "}
                  {podcast.sectionCount} sections
                </p>
              </div>

              <Link href={`/podcast/${podcast.chapterId}`} className="shrink-0">
                <Button size="sm">
                  <Play />
                  <span className="hidden sm:inline">Écouter</span>
                </Button>
              </Link>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6 p-5 text-center">
        <p className="text-sm font-medium text-slate-900">
          Un chapitre sans podcast ?
        </p>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
          L&apos;IA rédige un script de révision à partir de tes leçons, puis le lit
          à voix haute. Tu peux ajuster la vitesse pendant l&apos;écoute.
        </p>
        <Link href="/cours" className="mt-4 inline-block">
          <Button size="sm" variant="outline">
            Choisir un chapitre
          </Button>
        </Link>
      </Card>
    </div>
  );
}
