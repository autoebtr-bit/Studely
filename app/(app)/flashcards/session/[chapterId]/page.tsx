import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readChapter } from "@/lib/data/courses";
import { readDueFlashcards } from "@/lib/data/study";
import { ReviewSession } from "./review-session";

interface PageProps {
  params: { chapterId: string };
}

// Les cartes appartiennent à chaque élève : rien à pré-générer.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (params.chapterId === "toutes") {
    return { title: "Révision — toutes les cartes" };
  }
  const found = await readChapter(params.chapterId);
  return { title: found ? `Révision — ${found.chapter.title}` : "Révision" };
}

export default async function FlashcardSessionPage({ params }: PageProps) {
  const all = params.chapterId === "toutes";
  const found = all ? null : await readChapter(params.chapterId);

  if (!all && !found) notFound();

  const cards = await readDueFlashcards(all ? undefined : params.chapterId);

  return (
    <ReviewSession
      cards={cards}
      chapterId={params.chapterId}
      title={all ? "Toutes les cartes" : (found?.chapter.title ?? "Révision")}
    />
  );
}
