"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  FileText,
  Image as ImageIcon,
  Loader2,
  Type,
  Upload,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { postAi } from "@/lib/api/ai";
import { cn } from "@/lib/utils/cn";

type Mode = "fichier" | "texte";

/** Où en est un fichier dans la chaîne téléversement → analyse. */
type FileStatus = "attente" | "televersement" | "analyse" | "fait" | "erreur";

interface PendingFile {
  /** Clé stable : le nom ne suffit pas, deux fichiers peuvent le partager. */
  key: string;
  file: File;
  status: FileStatus;
  error?: string;
  chapterId?: string;
}

export interface ImportSubject {
  id: string;
  name: string;
  emoji: string;
}

interface ImportDropzoneProps {
  subjects: ImportSubject[];
}

const MAX_SIZE_MB = 20;

/**
 * Types acceptés par le bucket `documents` (migration `0007`).
 *
 * Le navigateur laisse `file.type` vide pour un `.md`, et parfois pour un
 * `.txt` : sans cette table de repli, le téléversement serait refusé par le
 * bucket pour un type vide, avec un message incompréhensible.
 */
const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  txt: "text/plain",
  md: "text/markdown",
};

const ACCEPTED = ".pdf,.png,.jpg,.jpeg,.webp,.txt,.md";

function extensionOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function mimeOf(file: File): string | null {
  const byExt = MIME_BY_EXT[extensionOf(file.name)];
  if (byExt) return byExt;
  // Un type annoncé par le navigateur mais inconnu du bucket serait refusé
  // côté stockage : autant le dire tout de suite.
  return null;
}

function isImage(file: File): boolean {
  return (mimeOf(file) ?? "").startsWith("image/");
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/**
 * Nom de fichier utilisable comme clé de stockage.
 *
 * Les accents et les espaces d'un nom de cours français passent mal dans une
 * clé d'objet ; l'unicité est portée par l'identifiant qui la préfixe, pas par
 * le nom, qui n'est là que pour se relire dans le tableau de bord Supabase.
 */
function safeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(-80);
}

const STATUS_LABEL: Record<FileStatus, string> = {
  attente: "",
  televersement: "Envoi…",
  analyse: "Analyse…",
  fait: "Leçons créées",
  erreur: "Échec",
};

/**
 * Zone d'import.
 *
 * Le fichier ne passe pas par la route : le corps d'une requête est plafonné à
 * ~4,5 Mo en production, un PDF de 20 Mo encodé en base64 en fait ~27. Le
 * navigateur téléverse donc vers le bucket `documents`, crée la ligne de suivi,
 * puis ne transmet que son identifiant — la route relit le fichier.
 *
 * Les fichiers sont traités **un par un**, et non en parallèle : chacun
 * consomme une génération, et une erreur sur le troisième ne doit pas laisser
 * l'élève dans le doute sur les deux premiers.
 */
export function ImportDropzone({ subjects }: ImportDropzoneProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("fichier");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [pastedText, setPastedText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((list: FileList | null) => {
    if (!list) return;
    setError(null);

    const accepted: PendingFile[] = [];
    for (const file of Array.from(list)) {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`« ${file.name} » dépasse ${MAX_SIZE_MB} Mo et a été ignoré.`);
        continue;
      }
      if (!mimeOf(file)) {
        setError(`« ${file.name} » n'est pas un format accepté et a été ignoré.`);
        continue;
      }
      accepted.push({
        key: `${file.name}-${file.lastModified}-${file.size}`,
        file,
        status: "attente",
      });
    }
    setFiles((prev) => [
      ...prev,
      // Déposer deux fois le même fichier est une maladresse courante, et
      // chaque doublon coûterait une génération.
      ...accepted.filter((a) => !prev.some((p) => p.key === a.key)),
    ]);
  }, []);

  function patch(key: string, next: Partial<PendingFile>) {
    setFiles((prev) => prev.map((f) => (f.key === key ? { ...f, ...next } : f)));
  }

  /** Téléverse un fichier et crée sa ligne de suivi. Renvoie son identifiant. */
  async function upload(entry: PendingFile, userId: string): Promise<string> {
    const supabase = createClient();
    const mime = mimeOf(entry.file)!;

    // Le préfixe par identifiant n'est pas décoratif : les policies du bucket
    // comparent le premier segment du chemin à `auth.uid()`.
    const path = `${userId}/${crypto.randomUUID()}-${safeName(entry.file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(path, entry.file, { contentType: mime, upsert: false });

    if (uploadError) {
      throw new Error("Le fichier n'a pas pu être envoyé. Vérifie ta connexion.");
    }

    const { data: row, error: rowError } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        storage_path: path,
        original_name: entry.file.name,
        mime_type: mime,
        size_bytes: entry.file.size,
        status: "en_attente",
      })
      .select("id")
      .single();

    if (rowError || !row) {
      throw new Error("Le fichier est envoyé mais n'a pas pu être enregistré.");
    }

    return row.id;
  }

  async function submitFiles() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Ta session a expiré. Reconnecte-toi.");
      return;
    }

    const todo = files.filter((f) => f.status !== "fait");
    let lastChapterId: string | null = null;
    let done = 0;

    for (const entry of todo) {
      patch(entry.key, { status: "televersement", error: undefined });

      let documentId: string;
      try {
        documentId = await upload(entry, user.id);
      } catch (e) {
        patch(entry.key, {
          status: "erreur",
          error: e instanceof Error ? e.message : "Envoi impossible.",
        });
        continue;
      }

      patch(entry.key, { status: "analyse" });

      const result = await postAi<{ chapterId: string; lessons: number }>(
        "/api/upload/extract",
        { subjectId, documentId },
      );

      if (!result.ok) {
        patch(entry.key, { status: "erreur", error: result.error });
        continue;
      }

      lastChapterId = result.data.chapterId;
      done += 1;
      patch(entry.key, { status: "fait", chapterId: result.data.chapterId });
    }

    // Un seul cours importé : on emmène l'élève dessus, c'est ce qu'il attend.
    // Plusieurs : la liste, pour qu'il voie tout ce qui a été créé.
    if (done === 1 && lastChapterId) router.push(`/cours/${lastChapterId}`);
    else if (done > 1) router.push("/cours");
    router.refresh();
  }

  async function submitText() {
    const result = await postAi<{ chapterId: string }>("/api/upload/extract", {
      subjectId,
      text: pastedText.trim(),
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push(`/cours/${result.data.chapterId}`);
    router.refresh();
  }

  async function submit() {
    if (!subjectId) {
      setError("Choisis une matière avant de lancer l'analyse.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      if (mode === "fichier") await submitFiles();
      else await submitText();
    } finally {
      setProcessing(false);
    }
  }

  const canSubmit =
    subjectId !== "" &&
    (mode === "fichier"
      ? files.some((f) => f.status !== "fait")
      : pastedText.trim().length > 40);

  return (
    <>
      <Card className="mb-4 p-4">
        <label htmlFor="subject" className="text-sm font-medium text-slate-900">
          Dans quelle matière ?
        </label>
        <select
          id="subject"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="mt-2 h-11 w-full rounded-card border border-cream-300 bg-white px-3 text-sm outline-none transition-colors focus:border-brand-400"
        >
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.emoji} {subject.name}
            </option>
          ))}
        </select>
      </Card>

      {/* Sélecteur de mode */}
      <div className="mb-4 flex gap-1.5">
        {(
          [
            { key: "fichier", label: "Fichier", icon: Upload },
            { key: "texte", label: "Texte collé", icon: Type },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setMode(tab.key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-pill px-4 py-2 text-sm font-medium transition-colors",
              mode === tab.key
                ? "bg-ink-900 text-white"
                : "border border-cream-300 bg-white text-slate-700 hover:border-brand-200",
            )}
          >
            <tab.icon className="size-4" aria-hidden />
            {tab.label}
          </button>
        ))}
      </div>

      {mode === "fichier" ? (
        <>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            className={cn(
              "rounded-card border-2 border-dashed p-10 text-center transition-colors",
              dragging
                ? "border-brand-500 bg-brand-50"
                : "border-brand-300/60 bg-white/50",
            )}
          >
            <span className="mx-auto grid size-12 place-items-center rounded-card bg-brand-100 text-brand-600">
              <Upload className="size-6" aria-hidden />
            </span>
            <p className="mt-4 font-medium text-slate-900">
              Dépose tes fichiers ici
            </p>
            <p className="mt-1 text-sm text-slate-500">
              PDF, photos de cahier, ou fichiers texte — jusqu&apos;à {MAX_SIZE_MB} Mo
              chacun
            </p>

            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED}
              className="sr-only"
              onChange={(e) => addFiles(e.target.files)}
            />
            <Button
              variant="outline"
              className="mt-5"
              onClick={() => inputRef.current?.click()}
              disabled={processing}
            >
              Parcourir mes fichiers
            </Button>
          </div>

          {files.length > 0 && (
            <ul className="mt-4 space-y-2">
              {files.map((entry) => (
                <li key={entry.key}>
                  <Card className="flex items-center gap-3 p-3">
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-tile",
                        entry.status === "fait"
                          ? "bg-emerald-100 text-emerald-700"
                          : entry.status === "erreur"
                            ? "bg-red-100 text-red-600"
                            : "bg-brand-100 text-brand-600",
                      )}
                    >
                      {entry.status === "fait" ? (
                        <Check className="size-4" aria-hidden />
                      ) : entry.status === "erreur" ? (
                        <AlertCircle className="size-4" aria-hidden />
                      ) : entry.status === "attente" ? (
                        isImage(entry.file) ? (
                          <ImageIcon className="size-4" aria-hidden />
                        ) : (
                          <FileText className="size-4" aria-hidden />
                        )
                      ) : (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {entry.file.name}
                      </p>
                      <p
                        className={cn(
                          "text-xs",
                          entry.status === "erreur"
                            ? "text-red-600"
                            : "text-slate-500",
                        )}
                      >
                        {entry.status === "erreur"
                          ? entry.error
                          : entry.status === "attente"
                            ? formatSize(entry.file.size)
                            : STATUS_LABEL[entry.status]}
                      </p>
                    </div>

                    {!processing && entry.status !== "fait" && (
                      <button
                        type="button"
                        onClick={() =>
                          setFiles((prev) => prev.filter((f) => f.key !== entry.key))
                        }
                        aria-label={`Retirer ${entry.file.name}`}
                        className="rounded-full p-1.5 text-slate-400 hover:bg-cream-100 hover:text-slate-900"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <Card className="p-5">
          <label htmlFor="pasted" className="text-sm font-medium text-slate-900">
            Colle ton cours
          </label>
          <textarea
            id="pasted"
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            rows={12}
            placeholder="Colle ici le texte de ton cours…"
            className="mt-2 w-full resize-y rounded-card border border-cream-300 p-4 text-sm leading-relaxed outline-none transition-colors focus:border-brand-400"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            {pastedText.trim().length} caractères — au moins 40 pour lancer
            l&apos;analyse.
          </p>
        </Card>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 text-sm text-red-600"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      <Button
        className="mt-5 w-full"
        size="lg"
        disabled={!canSubmit || processing}
        onClick={submit}
      >
        {processing && <Loader2 className="animate-spin" />}
        {processing ? "Analyse en cours…" : "Analyser et créer les leçons"}
      </Button>

      <p className="mt-3 text-center text-xs text-slate-400">
        Tes documents restent privés : ils ne sont accessibles qu&apos;à ton compte.
      </p>
    </>
  );
}
