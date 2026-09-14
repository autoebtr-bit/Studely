"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { XpToast } from "@/components/gamification/xp-toast";
import {
  REVIEW_BUTTONS,
  formatInterval,
  initialState,
  isSuccess,
  review,
  type ReviewButtonKey,
  type Sm2State,
} from "@/lib/srs/sm2";
import { XP_RULES } from "@/lib/xp/rules";
import type { AppFlashcard } from "@/lib/data/types";
import { cn } from "@/lib/utils/cn";
import { completeReviewSession, recordReview } from "../../actions";

interface ReviewSessionProps {
  cards: AppFlashcard[];
  title: string;
  /** Chapitre révisé, ou `"toutes"` pour une session tous chapitres. */
  chapterId: string;
}

/**
 * Session de révision.
 *
 * Chaque réponse est enregistrée par une Server Action qui **recalcule** SM-2 à
 * partir de l'état stocké et crédite l'XP par la RPC. L'état local ne sert qu'à
 * l'affichage : l'aperçu « revient dans 12 j » sur les boutons, et l'animation
 * du gain. Rien de ce qui compte n'est écrit depuis ici.
 *
 * L'enregistrement ne bloque pas l'enchaînement : attendre le serveur entre
 * deux cartes casserait le rythme, qui est tout l'intérêt de l'exercice.
 */
export function ReviewSession({ cards, title, chapterId }: ReviewSessionProps) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [states, setStates] = useState<Record<string, Sm2State>>({});
  const [correct, setCorrect] = useState(0);
  const [xpGained, setXpGained] = useState(0);
  const [toastKey, setToastKey] = useState(0);
  const [failed, setFailed] = useState(0);

  const current = cards[index];
  const finished = index >= cards.length;

  // L'état de départ vient de la base, pas de zéro : une carte déjà révisée six
  // fois doit annoncer son vrai prochain rappel, pas « 1 j ».
  const currentState = useMemo(() => {
    if (!current) return initialState();
    return states[current.id] ?? current.srs;
  }, [current, states]);

  const answer = useCallback(
    (key: ReviewButtonKey) => {
      if (!current) return;
      const button = REVIEW_BUTTONS.find((b) => b.key === key);
      if (!button) return;

      const next = review(currentState, button.grade);
      setStates((prev) => ({ ...prev, [current.id]: next }));
      if (isSuccess(button.grade)) setCorrect((c) => c + 1);

      setXpGained((x) => x + XP_RULES.flashcard_review.base);
      setToastKey((k) => k + 1);

      // Envoi sans attendre : la carte suivante s'affiche immédiatement. Les
      // échecs sont comptés et annoncés à la fin plutôt qu'interrompre la
      // session — perdre une carte sur trente ne justifie pas de tout stopper.
      void recordReview({ cardId: current.id, grade: button.grade }).then(
        (result) => {
          if (!result.ok) setFailed((f) => f + 1);
        },
      );

      setRevealed(false);
      setIndex((i) => i + 1);
    },
    [current, currentState],
  );

  // Le bonus de fin ne se gagne qu'une fois arrivé au bout, et la RPC le
  // déduplique par chapitre et par jour.
  useEffect(() => {
    if (finished && cards.length > 0) void completeReviewSession(chapterId);
  }, [finished, cards.length, chapterId]);

  const restart = useCallback(() => {
    setIndex(0);
    setRevealed(false);
    setStates({});
    setCorrect(0);
    setXpGained(0);
    setFailed(0);
  }, []);

  // Raccourcis clavier : Espace révèle, 1-4 notent. Indispensable pour enchaîner.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (finished) return;

      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (!revealed) setRevealed(true);
        return;
      }
      if (!revealed) return;

      const n = Number(e.key);
      if (n >= 1 && n <= REVIEW_BUTTONS.length) {
        e.preventDefault();
        answer(REVIEW_BUTTONS[n - 1]!.key);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, finished, answer]);

  if (cards.length === 0) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <Card className="p-10">
          <p className="text-3xl" aria-hidden>
            🎉
          </p>
          <p className="mt-3 font-medium text-slate-900">Aucune carte à revoir ici</p>
          <p className="mt-1 text-sm text-slate-600">
            Génère des cartes depuis un chapitre pour commencer.
          </p>
          <Link href="/flashcards" className="mt-5 inline-block">
            <Button>Retour aux flashcards</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (finished) {
    const accuracy = Math.round((correct / cards.length) * 100);
    return (
      <div className="mx-auto max-w-xl text-center">
        <Card className="p-10">
          <p className="text-4xl" aria-hidden>
            {accuracy >= 80 ? "🏆" : accuracy >= 50 ? "💪" : "📚"}
          </p>
          <h1 className="mt-4 text-xl font-semibold text-slate-900">
            Session terminée
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {correct} / {cards.length} réussies — {accuracy}% de réussite
          </p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-pill bg-brand-100 px-4 py-2 text-sm font-semibold text-brand-700">
            +{xpGained + XP_RULES.flashcard_session_completed.base} XP
          </div>

          {/* Le dire plutôt que de laisser croire que tout est enregistré : ces
              cartes reviendront au prochain passage, ce qui est déroutant si
              l'élève pense les avoir traitées. */}
          {failed > 0 && (
            <p role="alert" className="mt-4 text-sm text-amber-700">
              {failed} carte{failed > 1 ? "s" : ""} n&apos;{failed > 1 ? "ont" : "a"}{" "}
              pas pu être enregistrée{failed > 1 ? "s" : ""} et te ser
              {failed > 1 ? "ont" : "a"} reproposée{failed > 1 ? "s" : ""}.
            </p>
          )}

          <div className="mt-6 flex justify-center gap-2.5">
            <Button onClick={restart} variant="outline">
              <RotateCcw />
              Recommencer
            </Button>
            <Link href="/flashcards">
              <Button>Terminer</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const progressPct = (index / cards.length) * 100;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/flashcards"
          aria-label="Quitter la session"
          className="rounded-full p-2 text-slate-400 transition-colors hover:bg-cream-100 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{title}</p>
          <Progress
            value={progressPct}
            className="mt-1.5 h-1.5"
            label="Avancement de la session"
          />
        </div>
        <span className="shrink-0 text-sm tabular-nums text-slate-500">
          {index + 1} / {cards.length}
        </span>
      </div>

      <Card className="relative min-h-[280px] p-7">
        <XpToast key={toastKey} amount={XP_RULES.flashcard_review.base} show={toastKey > 0} />

        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Question
        </p>
        <p className="mt-2 text-lg font-medium leading-snug text-slate-900">
          {current?.front}
        </p>

        {revealed && (
          <div className="mt-6 animate-fade-up border-t border-cream-200 pt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Réponse
            </p>
            <p className="mt-2 leading-relaxed text-slate-800">{current?.back}</p>
          </div>
        )}
      </Card>

      {!revealed ? (
        <Button className="mt-5 w-full" size="lg" onClick={() => setRevealed(true)}>
          Afficher la réponse
        </Button>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {REVIEW_BUTTONS.map((button, i) => {
            const preview = review(currentState, button.grade);
            return (
              <button
                key={button.key}
                type="button"
                onClick={() => answer(button.key)}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-card border px-3 py-3 transition-colors",
                  button.key === "again" &&
                    "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
                  button.key === "hard" &&
                    "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
                  button.key === "good" &&
                    "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100",
                  button.key === "easy" &&
                    "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                )}
              >
                <span className="text-sm font-semibold">{button.label}</span>
                <span className="text-[11px] opacity-70">
                  {formatInterval(preview.intervalDays)}
                </span>
                <span className="text-[10px] opacity-50">touche {i + 1}</span>
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-center text-xs text-slate-400">
        Espace pour révéler · 1 à 4 pour noter
      </p>
    </div>
  );
}
