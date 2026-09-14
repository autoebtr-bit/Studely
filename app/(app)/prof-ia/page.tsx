import type { Metadata } from "next";
import { ASSISTANT } from "@/lib/assistant";
import { readSubjects } from "@/lib/data/courses";
import { ChatPanel } from "./chat-panel";

// L'URL reste `/prof-ia` : la changer casserait les liens existants sans rien
// apporter de visible.
export const metadata: Metadata = { title: ASSISTANT.name };

export default async function ProfIaPage() {
  const subjects = await readSubjects();

  // Sans cours importé, la liste est vide : le sélecteur de chapitre n'affiche
  // rien et la conversation porte sur ce que l'élève écrit, sans contexte.
  const chapters = subjects.flatMap((s) =>
    s.chapters.map((c) => ({
      id: c.id,
      label: `${s.emoji} ${c.title}`,
      subject: s.name,
    })),
  );

  return <ChatPanel chapters={chapters} />;
}
