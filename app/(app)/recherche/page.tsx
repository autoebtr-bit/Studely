import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { readSubjects } from "@/lib/data/courses";
import { SearchPanel } from "./search-panel";

export const metadata: Metadata = { title: "Recherche" };

export default async function RecherchePage() {
  const subjects = await readSubjects();

  const chapters = subjects.flatMap((s) =>
    s.chapters.map((c) => ({
      id: c.id,
      title: c.title,
      subjectName: s.name,
      emoji: s.emoji,
      progressPct: c.progressPct,
    })),
  );

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Recherche" description="Trouve un module ou un chapitre." />
      <SearchPanel chapters={chapters} />
    </div>
  );
}
