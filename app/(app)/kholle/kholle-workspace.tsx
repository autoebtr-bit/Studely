"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Info,
  Loader2,
  Mic,
  MicOff,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormatPicker } from "@/components/kholle/format-picker";
import { PhaseTimer } from "@/components/kholle/phase-timer";
import { KholleReport } from "@/components/kholle/kholle-report";
import { getFormat, playablePhases } from "@/lib/kholle/formats";
import {
  MIN_CHARS_BEFORE_RELANCE,
  PAUSE_BEFORE_RELANCE_MS,
} from "@/lib/kholle/timing";
import { DEMO_PROGRAMME, DEMO_SUBJECT } from "@/lib/kholle/demo-subject";
import type { KholleGrade, KholleSubject } from "@/lib/ai/schemas";
import { useSpeechRecognition } from "@/lib/voice/use-speech-recognition";
import { useVoices } from "@/lib/voice/use-voices";
import { VoiceSettings } from "@/components/voice/voice-settings";
import { speechProvider } from "@/lib/voice/web-speech-tts";
import { KHOLLES_OFFERTES } from "@/lib/billing/plans";
import { formatDateLong } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

type Stage = "setup" | "session" | "report";

interface PhaseAnswer {
  phaseId: string;
  prompt: string;
  expectedPoints: string[];
  transcript: string;
  relances: string[];
}

export interface KholleBalance {
  /** Khôlles de bienvenue restantes. */
  credits: number;
  /** Khôlles restantes sur la période du plan. */
  remaining: number;
  /** Date de renouvellement de l'allocation, en ISO court. */
  resetsAt: string;
  /**
   * Faux pour l'essai gratuit, qui ne se renouvelle pas. `resetsAt` ne doit
   * alors jamais être affiché : il n'y aura pas de prochaine khôlle.
   */
  renews: boolean;
}


/**
 * Poste de travail de la khôlle blanche.
 *
 * Trois états : préparation du sujet, épreuve, fiche de notation.
 *
 * Le point important est le déclenchement des relances. Un khôlleur n'interrompt
 * pas au hasard : il attend une respiration. On imite ça en guettant un silence
 * après une quantité suffisante de discours, plutôt qu'en sondant l'IA à
 * intervalle fixe — ce qui coûterait cher et couperait la parole.
 */
export function KholleWorkspace({
  balance = null,
}: {
  /** `null` quand aucune session n'est ouverte : on n'affiche alors rien. */
  balance?: KholleBalance | null;
}) {
  const [stage, setStage] = useState<Stage>("setup");
  const [formatId, setFormatId] = useState("sciences-cours-exercice");
  const [programme, setProgramme] = useState(DEMO_PROGRAMME);

  const [subject, setSubject] = useState<KholleSubject | null>(null);
  const [grade, setGrade] = useState<KholleGrade | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  const [phaseIndex, setPhaseIndex] = useState(0);
  const [answers, setAnswers] = useState<PhaseAnswer[]>([]);
  const [typed, setTyped] = useState("");
  const [relances, setRelances] = useState<string[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingRelance, setCheckingRelance] = useState(false);

  const recognition = useSpeechRecognition("fr-FR");
  const voice = useVoices();

  // Sans solde connu (pas de session), on ne bride rien : c'est l'API qui
  // tranche, et le mode démonstration doit rester jouable.
  const exhausted =
    balance !== null && balance.credits === 0 && balance.remaining === 0;

  /** Essai épuisé : rien ne se recharge, l'abonnement est la seule suite. */
  const trialOver = exhausted && balance !== null && !balance.renews;

  const balanceMessage = !balance
    ? null
    : trialOver
      ? `Ton essai est terminé : tes ${KHOLLES_OFFERTES} khôlles blanches ont été utilisées.`
      : exhausted
        ? `Plus de khôlle pour l'instant. La prochaine arrive le ${formatDateLong(balance.resetsAt)}.`
        : balance.credits > 0
          ? `Il te reste ${balance.credits} khôlle${balance.credits > 1 ? "s" : ""} offerte${balance.credits > 1 ? "s" : ""} sur ${KHOLLES_OFFERTES}.`
          : `Il te reste ${balance.remaining} khôlle${balance.remaining > 1 ? "s" : ""} jusqu'au ${formatDateLong(balance.resetsAt)}.`;

  const format = getFormat(formatId);
  const phases = format ? playablePhases(format) : [];
  const phase = phases[phaseIndex];
  const subjectPhase = subject?.phases.find((p) => p.phaseId === phase?.id);

  // Le micro alimente la même zone que le clavier : l'élève peut corriger ce
  // que la reconnaissance a mal transcrit.
  useEffect(() => {
    if (recognition.transcript) setTyped(recognition.transcript);
  }, [recognition.transcript]);

  useEffect(() => () => speechProvider.cancel(), []);

  // Le personnage choisi porte le débit et la hauteur : c'est lui qui décide du
  // caractère de l'examinateur, pas seulement du timbre.
  const speakOptions = voice.speakOptions;
  const speak = useCallback(
    (text: string) => {
      speechProvider.speak(text, speakOptions);
    },
    [speakOptions],
  );

  /* ------------------------------------------------------ Préparer le sujet */

  async function start() {
    if (!format) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/kholle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "subject", formatId, programme }),
      });

      // Un quota épuisé ou un budget suspendu sont de vraies réponses : les
      // masquer derrière une fausse khôlle ferait croire à l'élève qu'il lui en
      // reste, et il ne comprendrait pas pourquoi la notation échoue ensuite.
      if (res.status === 429 || res.status === 503) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(body?.error ?? "Tu n'as plus de khôlle blanche disponible.");
        return;
      }

      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as KholleSubject;
      setSubject(data);
      setDemoMode(false);
      enterSession(data);
    } catch {
      // Tant que la base et la clé API ne sont pas branchées, la route répond
      // 401 : on bascule alors sur un sujet réel pré-écrit plutôt que d'afficher
      // une erreur, car la khôlle doit rester démontrable.
      setSubject(DEMO_SUBJECT);
      setDemoMode(true);
      enterSession(DEMO_SUBJECT);
    } finally {
      setBusy(false);
    }
  }

  function enterSession(loaded: KholleSubject) {
    setStage("session");
    setPhaseIndex(0);
    setAnswers([]);
    setTyped("");
    setRelances([]);
    recognition.reset();

    const first = loaded.phases[0];
    if (first) window.setTimeout(() => speak(first.prompt), 400);
  }

  /* ----------------------------------------------------------- Relances -- */

  const lastCheckedLengthRef = useRef(0);
  const pauseTimerRef = useRef<number | null>(null);

  const askForRelance = useCallback(async () => {
    if (!format || !phase || !subjectPhase) return;
    if (!phase.interruptive) return;

    const said = typed.trim();
    if (said.length - lastCheckedLengthRef.current < MIN_CHARS_BEFORE_RELANCE) return;

    lastCheckedLengthRef.current = said.length;
    setCheckingRelance(true);

    try {
      const res = await fetch("/api/ai/kholle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "relance",
          formatId,
          phaseId: phase.id,
          prompt: subjectPhase.prompt,
          expectedPoints: subjectPhase.expectedPoints,
          transcript: said,
          previousRelances: relances,
        }),
      });

      if (!res.ok) return;
      const data = (await res.json()) as {
        shouldInterrupt: boolean;
        relance: string;
      };

      if (data.shouldInterrupt && data.relance) {
        setRelances((prev) => [...prev, data.relance]);
        speak(data.relance);
      }
    } catch {
      // Une relance manquée n'interrompt pas l'épreuve.
    } finally {
      setCheckingRelance(false);
    }
  }, [format, phase, subjectPhase, typed, relances, formatId, speak]);

  // Guette la respiration : après un silence, le khôlleur peut intervenir.
  useEffect(() => {
    if (stage !== "session" || !phase?.interruptive || demoMode) return;

    if (pauseTimerRef.current !== null) window.clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = window.setTimeout(
      () => void askForRelance(),
      PAUSE_BEFORE_RELANCE_MS,
    );

    return () => {
      if (pauseTimerRef.current !== null) window.clearTimeout(pauseTimerRef.current);
    };
  }, [typed, stage, phase, demoMode, askForRelance]);

  /* ------------------------------------------------------ Phase suivante -- */

  function nextPhase() {
    if (!phase || !subjectPhase) return;

    const record: PhaseAnswer = {
      phaseId: phase.id,
      prompt: subjectPhase.prompt,
      expectedPoints: subjectPhase.expectedPoints,
      transcript: typed.trim(),
      relances,
    };
    const updated = [...answers, record];

    recognition.stop();
    recognition.reset();
    setAnswers(updated);
    setTyped("");
    setRelances([]);
    lastCheckedLengthRef.current = 0;
    speechProvider.cancel();

    const next = phaseIndex + 1;
    if (next < phases.length) {
      setPhaseIndex(next);
      const nextSubject = subject?.phases.find((p) => p.phaseId === phases[next]?.id);
      if (nextSubject) window.setTimeout(() => speak(nextSubject.prompt), 500);
      return;
    }

    void finish(updated);
  }

  async function finish(finalAnswers: PhaseAnswer[]) {
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/kholle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "grade", formatId, answers: finalAnswers }),
      });

      if (!res.ok) throw new Error(String(res.status));
      setGrade((await res.json()) as KholleGrade);
      setStage("report");
    } catch {
      setError(
        demoMode
          ? "La notation exige une session et une clé API. En démonstration, seule l'épreuve est jouable."
          : "La notation a échoué. Réessaie dans un instant.",
      );
      setBusy(false);
      return;
    }

    setBusy(false);
  }

  function restart() {
    speechProvider.cancel();
    recognition.stop();
    recognition.reset();
    setStage("setup");
    setSubject(null);
    setGrade(null);
    setAnswers([]);
    setTyped("");
    setRelances([]);
    setError(null);
  }

  /* ------------------------------------------------------------- Rendus -- */

  if (!format) return null;

  if (stage === "report" && grade && subject) {
    return (
      <KholleReport
        format={format}
        grade={grade}
        subject={subject}
        examinerPossessive={voice.examiner.possessive}
        onRestart={restart}
      />
    );
  }

  if (stage === "setup") {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
            Khôlle blanche
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-600">
            Entre le programme de la semaine. Tu passes l&apos;épreuve à l&apos;oral,
            avec les relances d&apos;un khôlleur, et tu obtiens une fiche notée.
          </p>
        </div>

        <Card className="p-6">
          <h2 className="text-sm font-semibold text-slate-900">Ton format</h2>
          <FormatPicker value={formatId} onChange={setFormatId} className="mt-4" />
        </Card>

        <Card className="p-6">
          <label htmlFor="programme" className="text-sm font-semibold text-slate-900">
            Programme de khôlle
          </label>
          <p className="mt-0.5 text-xs text-slate-500">
            Recopie ce que ton colleur a annoncé. Plus c&apos;est précis, plus le
            sujet tombera juste.
          </p>
          <textarea
            id="programme"
            value={programme}
            onChange={(e) => setProgramme(e.target.value)}
            rows={5}
            className="mt-3 w-full resize-y rounded-card border border-cream-300 p-4 text-sm leading-relaxed outline-none transition-colors focus:border-brand-400"
          />
        </Card>

        <Card className="p-6">
          <VoiceSettings voice={voice} />
        </Card>

        {recognition.isSupported === false && (
          <div className="flex items-start gap-2.5 rounded-card border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              Ce navigateur ne prend pas le micro en charge. Tu pourras répondre
              au clavier, mais l&apos;intérêt d&apos;une khôlle est de parler :
              ouvre la page dans Chrome ou Edge si tu peux.
            </p>
          </div>
        )}

        {/*
          Le solde se lit AVANT le clic : un bouton ne doit jamais échouer une
          fois pressé.
        */}
        {balance && (
          <p
            className={cn(
              "text-center text-sm",
              exhausted ? "font-medium text-amber-700" : "text-slate-600",
            )}
          >
            {balanceMessage}
          </p>
        )}

        {/*
          Essai terminé : c'est le moment exact où l'abonnement se décide. Un
          bouton mort intitulé « quota épuisé » le gâcherait.
        */}
        {trialOver ? (
          <Link
            href="/#tarifs"
            className={cn(buttonVariants({ size: "lg" }), "w-full")}
          >
            Voir l&apos;offre Pro
          </Link>
        ) : (
          <Button
            size="lg"
            className="w-full"
            onClick={start}
            disabled={busy || exhausted || programme.trim().length < 10}
          >
            {busy && <Loader2 className="animate-spin" />}
            {busy ? "Préparation du sujet…" : "Commencer la khôlle"}
          </Button>
        )}
      </div>
    );
  }

  /* ---------------------------------------------------------- En séance -- */

  return (
    <div className="space-y-4">
      {demoMode && (
        <div className="flex items-start gap-2.5 rounded-card border border-accent-200 bg-accent-50 p-4 text-sm text-accent-800">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            <strong>Mode démonstration.</strong> Sujet réel de maths pré-écrit,
            sans génération ni relances en direct — la base de données et la clé
            API ne sont pas encore branchées.
          </p>
        </div>
      )}

      {/* Fil des phases */}
      <div className="flex flex-wrap items-center gap-2">
        {phases.map((p, i) => (
          <span
            key={p.id}
            className={cn(
              "rounded-pill px-3 py-1 text-xs font-semibold",
              i === phaseIndex
                ? "bg-ink-900 text-white"
                : i < phaseIndex
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-cream-100 text-slate-500",
            )}
          >
            {p.label}
          </span>
        ))}
        <span className="ml-auto">
          <PhaseTimer
            minutes={phase?.minutes ?? 0}
            resetKey={phase?.id ?? ""}
            running={stage === "session"}
          />
        </span>
      </div>

      {/* Sujet */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {phase?.label}
          </p>
          <button
            type="button"
            onClick={() => subjectPhase && speak(subjectPhase.prompt)}
            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline"
          >
            <Volume2 className="size-3.5" aria-hidden />
            Réécouter
          </button>
        </div>

        <p className="mt-2 text-lg font-medium leading-snug text-slate-900">
          {subjectPhase?.prompt}
        </p>

        <p className="mt-3 rounded-card bg-cream-100 p-3.5 text-xs leading-relaxed text-slate-600">
          {phase?.instruction}
        </p>
      </Card>

      {/* Relances du khôlleur */}
      {relances.length > 0 && (
        <Card className="border-brand-200 bg-brand-50/60 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600">
            {voice.examiner.name} t&apos;interrompt
          </p>
          <ul className="mt-2 space-y-2">
            {relances.map((r, i) => (
              <li key={i} className="text-sm font-medium text-slate-900">
                « {r} »
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Réponse */}
      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="reponse" className="text-sm font-semibold text-slate-900">
            Ta réponse
          </label>
          {checkingRelance && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 className="size-3 animate-spin" aria-hidden />
              {voice.examiner.name} écoute
            </span>
          )}
        </div>

        <textarea
          id="reponse"
          value={typed + (recognition.interim ? ` ${recognition.interim}` : "")}
          onChange={(e) => setTyped(e.target.value)}
          rows={8}
          placeholder={
            recognition.isSupported
              ? "Parle : tout ce que tu dis s'écrit ici."
              : "Écris ta réponse ici."
          }
          className="mt-2 w-full resize-none rounded-card border border-cream-300 p-4 text-sm leading-relaxed outline-none transition-colors focus:border-brand-400"
        />

        {recognition.error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {recognition.error}
          </p>
        )}

        {error && (
          <p role="alert" className="mt-2 flex items-start gap-2 text-sm text-red-600">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          {recognition.isSupported && (
            <Button
              variant={recognition.isListening ? "danger" : "outline"}
              onClick={recognition.isListening ? recognition.stop : recognition.start}
            >
              {recognition.isListening ? <MicOff /> : <Mic />}
              {recognition.isListening ? "Arrêter" : "Parler"}
            </Button>
          )}

          {recognition.isListening && (
            <span className="inline-flex items-center gap-1.5 text-sm text-red-600">
              <span aria-hidden className="size-2 animate-pulse rounded-full bg-red-500" />
              À l&apos;oral
            </span>
          )}

          <Button
            className="ml-auto"
            onClick={nextPhase}
            disabled={busy || typed.trim().length === 0}
          >
            {busy && <Loader2 className="animate-spin" />}
            {phaseIndex < phases.length - 1 ? "Phase suivante" : "Terminer la khôlle"}
            {!busy && <ArrowRight />}
          </Button>
        </div>
      </Card>
    </div>
  );
}
