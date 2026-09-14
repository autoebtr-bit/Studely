import type { Metadata } from "next";
import { FolderPlus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { readSubjects } from "@/lib/data/courses";
import { ImportDropzone } from "./import-dropzone";

export const metadata: Metadata = { title: "Importer" };

/**
 * La route d'extraction exige une matière : un cours doit être rangé quelque
 * part. Plutôt que d'en inventer une, on renvoie vers le questionnaire
 * d'accueil, qui est justement l'écran qui les crée.
 */
export default async function ImporterPage() {
  const subjects = await readSubjects();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Importer un cours"
        description="PDF, photo d'un cahier, ou texte collé. L'IA en extrait les leçons et les notions clés."
      />

      {subjects.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title="Choisis d'abord tes matières"
          description="Un cours importé se range dans une matière. Indique lesquelles tu travailles, puis reviens déposer tes documents."
          action={{ label: "Choisir mes matières", href: "/onboarding" }}
        />
      ) : (
        <ImportDropzone
          subjects={subjects.map((s) => ({
            id: s.id,
            name: s.name,
            emoji: s.emoji,
          }))}
        />
      )}
    </div>
  );
}
