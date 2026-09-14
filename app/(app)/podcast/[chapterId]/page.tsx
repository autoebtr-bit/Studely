import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readPodcastByChapter } from "@/lib/data/study";
import { readChapter } from "@/lib/data/courses";
import { PodcastPlayer } from "./podcast-player";

interface PageProps {
  params: { chapterId: string };
}

// Plus de `generateStaticParams` : les chapitres appartiennent à chaque élève,
// il n'y a plus de liste connue à la compilation.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const podcast = await readPodcastByChapter(params.chapterId);
  return { title: podcast?.title ?? "Podcast" };
}

export default async function PodcastDetailPage({ params }: PageProps) {
  const [podcast, found] = await Promise.all([
    readPodcastByChapter(params.chapterId),
    readChapter(params.chapterId),
  ]);

  if (!podcast) notFound();

  return (
    <PodcastPlayer
      title={podcast.title}
      chapterTitle={found?.chapter.title ?? ""}
      script={podcast.script}
    />
  );
}
