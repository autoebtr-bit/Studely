"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Headphones,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Square,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { XP_RULES } from "@/lib/xp/rules";
import { speechProvider } from "@/lib/voice/web-speech-tts";
import { PODCAST_VOICE_SETTINGS } from "@/lib/voice/voice-catalog";
import { useVoices } from "@/lib/voice/use-voices";
import { VoiceSettings } from "@/components/voice/voice-settings";
import { cn } from "@/lib/utils/cn";

/**
 * Multiplicateurs de vitesse.
 *
 * Ils s'appliquent PAR-DESSUS le débit du personnage choisi : celui-ci donne le
 * caractère de la voix, la vitesse sert à écouter plus ou moins vite. Les deux
 * réglages répondent à des besoins différents et ne doivent pas se remplacer.
 */
const SPEEDS = [0.85, 1, 1.25, 1.5] as const;

interface PodcastPlayerProps {
  title: string;
  chapterTitle: string;
  script: string[];
}

/**
 * Lecteur de podcast s'appuyant sur la synthèse vocale du navigateur.
 *
 * Le script est découpé en sections : on lit section par section, ce qui permet
 * d'avancer/reculer et de surligner le passage en cours — impossible avec un
 * seul long énoncé.
 */
export function PodcastPlayer({ title, chapterTitle, script }: PodcastPlayerProps) {
  const voice = useVoices();
  const { supported } = voice;

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  /** Multiplicateur de vitesse, appliqué par-dessus le débit du personnage. */
  const [speed, setSpeed] = useState(1);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lus par le callback de fin d'énoncé, qui ne doit pas dépendre du rendu.
  const indexRef = useRef(0);
  const playingRef = useRef(false);
  const optionsRef = useRef(voice.speakOptions);
  const speedRef = useRef(1);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    optionsRef.current = voice.speakOptions;
  }, [voice.speakOptions]);

  // Coupe la lecture si l'utilisateur quitte la page : sans cela la voix
  // continue de parler par-dessus l'écran suivant.
  useEffect(() => () => speechProvider.cancel(), []);

  const speakSection = useCallback(
    (i: number) => {
      const text = script[i];
      if (text === undefined) {
        setPlaying(false);
        setFinished(true);
        return;
      }

      speechProvider.speak(text, {
        ...optionsRef.current,
        // Le personnage donne le débit de base ; la vitesse de lecture le
        // multiplie, sans le remplacer.
        rate: (optionsRef.current.rate ?? 1) * speedRef.current,
        onEnd: () => {
          if (!playingRef.current) return;
          const next = indexRef.current + 1;
          if (next >= script.length) {
            setPlaying(false);
            setFinished(true);
            return;
          }
          setIndex(next);
          indexRef.current = next;
          speakSection(next);
        },
        onError: (message) => {
          setError(message);
          setPlaying(false);
        },
      });
    },
    [script],
  );

  const play = useCallback(() => {
    setError(null);
    setFinished(false);
    setPlaying(true);
    playingRef.current = true;
    speakSection(indexRef.current);
  }, [speakSection]);

  const pause = useCallback(() => {
    setPlaying(false);
    playingRef.current = false;
    speechProvider.cancel();
  }, []);

  const stop = useCallback(() => {
    pause();
    setIndex(0);
    indexRef.current = 0;
    setFinished(false);
  }, [pause]);

  const jump = useCallback(
    (delta: number) => {
      const next = Math.max(0, Math.min(script.length - 1, indexRef.current + delta));
      setIndex(next);
      indexRef.current = next;
      setFinished(false);

      if (playingRef.current) {
        speechProvider.cancel();
        speakSection(next);
      }
    },
    [script.length, speakSection],
  );

  const changeSpeed = useCallback(
    (value: number) => {
      setSpeed(value);
      speedRef.current = value;
      // La vitesse ne s'applique qu'au prochain énoncé : on relit la section.
      if (playingRef.current) {
        speechProvider.cancel();
        speakSection(indexRef.current);
      }
    },
    [speakSection],
  );

  const progressPct = ((index + (finished ? 1 : 0)) / script.length) * 100;

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/podcast"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-brand-600"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Tous les podcasts
      </Link>

      <Card className="overflow-hidden p-0">
        <div className="gradient-sunset relative flex items-center gap-4 p-6 text-white">
          <span className="module-orb" aria-hidden />
          <span className="relative grid size-14 shrink-0 place-items-center rounded-card bg-white/20">
            <Headphones className="size-7" aria-hidden />
          </span>
          <div className="relative min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
            <p className="truncate text-sm text-white/75">{chapterTitle}</p>
          </div>
        </div>

        <div className="p-6">
          {supported === false && (
            <div className="mb-5 rounded-card border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-medium">Lecture audio indisponible</p>
              <p className="mt-1">
                Ce navigateur ne propose pas de synthèse vocale. Le script reste
                lisible ci-dessous — ou ouvre la page dans Chrome ou Edge pour
                l&apos;écouter.
              </p>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <Progress value={progressPct} label="Avancement du podcast" />
          <div className="mt-1.5 flex justify-between text-xs tabular-nums text-slate-500">
            <span>
              Section {Math.min(index + 1, script.length)} / {script.length}
            </span>
            <span>{Math.round(progressPct)}%</span>
          </div>

          {/* Commandes de lecture */}
          <div className="mt-5 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              aria-label="Section précédente"
              onClick={() => jump(-1)}
              disabled={supported === false || index === 0}
            >
              <SkipBack />
            </Button>

            <Button
              size="icon"
              aria-label={playing ? "Mettre en pause" : "Lancer la lecture"}
              onClick={playing ? pause : play}
              disabled={supported !== true}
              className="size-14"
            >
              {playing ? <Pause /> : <Play />}
            </Button>

            <Button
              variant="outline"
              size="icon"
              aria-label="Section suivante"
              onClick={() => jump(1)}
              disabled={supported === false || index >= script.length - 1}
            >
              <SkipForward />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Arrêter et revenir au début"
              onClick={stop}
              disabled={supported === false}
            >
              <Square />
            </Button>
          </div>

          {/* Vitesse de lecture, indépendante du personnage */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
            <span className="mr-1 text-xs text-slate-500">Vitesse</span>
            {SPEEDS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => changeSpeed(value)}
                className={cn(
                  "rounded-pill px-2.5 py-1 text-xs font-medium transition-colors",
                  speed === value
                    ? "bg-brand-600 text-white"
                    : "bg-cream-100 text-slate-700 hover:bg-cream-200",
                )}
              >
                ×{value}
              </button>
            ))}
          </div>

          {/* Voix de lecture */}
          {supported !== false && (
            <div className="mt-6 border-t border-cream-200 pt-5">
              <VoiceSettings voice={voice} />
            </div>
          )}

          {finished && (
            <p className="mt-5 rounded-card bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700">
              Chapitre écouté en entier — +{XP_RULES.podcast_chapter_listened.base} XP
            </p>
          )}
        </div>
      </Card>

      {/* Script, surlignant la section en cours */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Transcription</h2>
        <div className="space-y-2">
          {script.map((section, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setIndex(i);
                indexRef.current = i;
                setFinished(false);
                if (playingRef.current) {
                  speechProvider.cancel();
                  speakSection(i);
                }
              }}
              className={cn(
                "block w-full rounded-card border p-4 text-left text-sm leading-relaxed transition-colors",
                i === index
                  ? "border-brand-300 bg-brand-50 text-slate-900"
                  : "border-cream-200 bg-white text-slate-600 hover:border-brand-200",
              )}
            >
              {section}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
