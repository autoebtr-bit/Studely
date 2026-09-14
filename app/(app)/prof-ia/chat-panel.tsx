"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Bot, CornerDownLeft, Sparkles, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ASSISTANT } from "@/lib/assistant";
import { streamAi } from "@/lib/api/ai";
import { cn } from "@/lib/utils/cn";

interface ChapterOption {
  id: string;
  label: string;
  subject: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Vrai tant que la réponse arrive en flux. */
  streaming?: boolean;
}

const SUGGESTIONS = [
  "Explique-moi le raisonnement par récurrence avec un exemple simple",
  "Quelle est la différence entre convergence et divergence ?",
  "Donne-moi un plan de dissertation sur la conscience",
  "Comment reconnaître une suite géométrique dans un énoncé ?",
];

/**
 * Nombre de tours renvoyés au modèle à chaque question.
 *
 * L'historique est refacturé en entier à chaque appel et n'est pas cachable
 * puisqu'il change à chaque tour : non borné, il finit par coûter plus cher que
 * la réponse elle-même. La route applique sa propre borne — celle-ci évite
 * simplement d'envoyer pour rien ce qu'elle tronquerait.
 */
const HISTORY_TURNS = 20;

/**
 * Interface de conversation avec Kollia.
 *
 * La réponse arrive en flux de texte brut depuis `/api/ai/chat` — pas du SSE,
 * donc rien à décoder : chaque fragment est concaténé tel quel dans la bulle en
 * cours. Le rendu (défilement, curseur clignotant, état de chargement) est
 * exactement celui qui avait été mis au point sur la simulation.
 */
export function ChatPanel({ chapters }: { chapters: ChapterOption[] }) {
  const [chapterId, setChapterId] = useState<string>(chapters[0]?.id ?? "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // L'historique se lit dans une référence plutôt que dans les dépendances :
  // sinon `send` serait recréé à chaque fragment reçu, donc des centaines de
  // fois par réponse.
  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Quitter l'écran en pleine réponse doit couper la requête : sans cela, le
  // flux continue d'être consommé pour rien et React avertit d'une écriture
  // dans un composant démonté.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || busy) return;

      const replyId = `a-${Date.now()}`;

      // L'historique est celui d'AVANT ce tour : le message courant part dans
      // `message`, l'y répéter ferait croire au modèle qu'il a été posé deux fois.
      const history = messagesRef.current
        .filter((m) => m.content !== "")
        .slice(-HISTORY_TURNS)
        .map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: "user", content },
        { id: replyId, role: "assistant", content: "", streaming: true },
      ]);
      setInput("");
      setBusy(true);
      setError(null);

      const controller = new AbortController();
      abortRef.current = controller;

      const result = await streamAi(
        "/api/ai/chat",
        {
          message: content,
          // Le champ attend un uuid : sans chapitre importé, il ne faut pas
          // envoyer une chaîne vide, que la validation rejetterait.
          ...(chapterId ? { chapterId } : {}),
          history,
        },
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === replyId ? { ...m, content: m.content + chunk } : m,
            ),
          );
        },
        { signal: controller.signal },
      );

      abortRef.current = null;
      setBusy(false);
      setMessages((prev) =>
        prev
          .map((m) => (m.id === replyId ? { ...m, streaming: false } : m))
          // Une bulle vide au nom de Kollia laisserait croire qu'elle n'a rien
          // à dire, alors que la demande n'est jamais partie.
          .filter((m) => m.id !== replyId || m.content !== ""),
      );

      if (!result.ok) setError(result.error);
    },
    [busy, chapterId],
  );

  return (
    <div className="mx-auto flex h-[calc(100vh-10rem)] max-w-3xl flex-col">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {ASSISTANT.name}
          </h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Pose tes questions, elle répond à partir de tes propres cours.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Chapitre</span>
          <select
            value={chapterId}
            onChange={(e) => setChapterId(e.target.value)}
            className="h-10 max-w-[220px] rounded-pill border border-cream-300 bg-white px-3.5 text-sm text-slate-900"
          >
            {/* Toujours présente : sans cours importé, la liste serait vide et
                le sélecteur paraîtrait cassé. Elle sert aussi aux questions
                générales, qui n'ont pas à être rattachées à un chapitre. */}
            <option value="">Aucun en particulier</option>
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div ref={scrollRef} className="scrollbar-slim flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="grid size-12 place-items-center rounded-card bg-gradient-to-br from-accent-600 to-accent-400 text-white">
                <Bot className="size-6" aria-hidden />
              </span>
              <p className="mt-4 font-medium text-slate-900">
                Qu&apos;est-ce qui te bloque aujourd&apos;hui ?
              </p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                {ASSISTANT.name} s&apos;appuie sur le chapitre sélectionné pour te
                répondre dans les termes de ton propre cours.
              </p>

              <div className="mt-6 grid w-full max-w-lg gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void send(suggestion)}
                    className="flex items-center gap-2 rounded-card border border-cream-200 bg-white px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:border-brand-200 hover:bg-brand-50"
                  >
                    <Sparkles className="size-3.5 shrink-0 text-brand-500" aria-hidden />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" && "flex-row-reverse",
                )}
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full",
                    message.role === "assistant"
                      ? "bg-gradient-to-br from-accent-600 to-accent-400 text-white"
                      : "bg-cream-100 text-slate-700",
                  )}
                >
                  {message.role === "assistant" ? (
                    <Bot className="size-4" aria-hidden />
                  ) : (
                    <User className="size-4" aria-hidden />
                  )}
                  {/* L'avatar est une pastille : sans ce libellé, rien ne dit
                      à la synthèse vocale qui parle. */}
                  <span className="sr-only">
                    {message.role === "assistant" ? ASSISTANT.name : "Toi"} :
                  </span>
                </span>

                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-card px-4 py-3 text-sm leading-relaxed",
                    message.role === "assistant"
                      ? "bg-cream-100 text-slate-800"
                      : "bg-brand-600 text-white",
                  )}
                >
                  {message.content}
                  {message.streaming && (
                    <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-current align-middle" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 border-t border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-end gap-2 border-t border-cream-200 p-3"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Entrée envoie, Maj+Entrée passe à la ligne.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            placeholder="Pose ta question…"
            aria-label="Votre question"
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-card border border-cream-300 px-4 py-3 text-sm outline-none transition-colors focus:border-brand-400"
          />
          <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Envoyer">
            <CornerDownLeft />
          </Button>
        </form>
      </Card>
    </div>
  );
}
