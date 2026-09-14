"use client";

import { useState } from "react";
import { Check, Info, Volume2 } from "lucide-react";
import { speechProvider } from "@/lib/voice/web-speech-tts";
import type { Examiner } from "@/lib/voice/examiners";
import type { UseVoicesResult } from "@/lib/voice/use-voices";
import { cn } from "@/lib/utils/cn";

const PREVIEW_TEXT =
  "Énoncez le théorème demandé avec toutes ses hypothèses, puis démontrez-le.";

interface VoiceSettingsProps {
  voice: UseVoicesResult;
  className?: string;
}

/**
 * Choix du khôlleur, et réglage de son timbre.
 *
 * Deux niveaux, volontairement séparés : le khôlleur donne le caractère (débit,
 * hauteur, genre recherché), la voix système donne le timbre. Sur une machine
 * pauvre en voix, c'est le khôlleur qui crée l'essentiel du choix réellement
 * perceptible.
 *
 * Chaque changement déclenche une écoute immédiate : un nom de voix ne dit rien
 * de son rendu.
 */
export function VoiceSettings({ voice, className }: VoiceSettingsProps) {
  const [playing, setPlaying] = useState<string | null>(null);

  function preview(
    overrides?: { rate?: number; pitch?: number; voiceUri?: string },
    key = "courant",
  ) {
    setPlaying(key);
    speechProvider.speak(PREVIEW_TEXT, {
      ...voice.speakOptions,
      ...overrides,
      onEnd: () => setPlaying(null),
      onError: () => setPlaying(null),
    });
  }

  /**
   * Aperçu d'un khôlleur.
   *
   * Il doit se faire entendre avec la voix que ce khôlleur retiendrait
   * réellement, pas avec la voix actuellement sélectionnée : sinon Vincent
   * s'écoute avec une voix féminine puis en donne une masculine une fois choisi.
   */
  function previewExaminer(examiner: Examiner) {
    const best = speechProvider.listVoices(examiner.prefer)[0]?.uri;
    preview(
      {
        rate: examiner.rate,
        pitch: examiner.pitch,
        voiceUri: best ?? voice.speakOptions.voiceUri,
      },
      examiner.id,
    );
  }

  if (voice.voices.length === 0 && voice.loading) {
    return (
      <p className={cn("text-sm text-slate-500", className)}>
        Recherche des voix disponibles…
      </p>
    );
  }

  if (voice.voices.length === 0) {
    return (
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-card border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800",
          className,
        )}
      >
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          <span className="block font-medium">
            Aucune voix française sur cet appareil
          </span>
          <span className="mt-1 block">
            Sous Windows : Paramètres → Heure et langue → Voix → Ajouter des
            voix → Français. Sinon, ouvre la page dans Chrome ou Edge.
          </span>
        </span>
      </div>
    );
  }

  const onlyLegacy = voice.voices.every((v) => v.quality === "ancienne");

  return (
    <div className={cn("space-y-4", className)}>
      {/* Khôlleurs */}
      <div>
        <p className="text-sm font-semibold text-slate-900">Ton khôlleur</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Écoute avant de choisir : c&apos;est cette voix qui te fera passer
          l&apos;oral.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {voice.examiners.map((examiner) => {
            const active = examiner.id === voice.examiner.id;
            return (
              <div
                key={examiner.id}
                className={cn(
                  "rounded-card border p-3.5 transition-colors",
                  active
                    ? "border-brand-500 bg-brand-50"
                    : "border-cream-300 bg-white hover:border-brand-300",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => voice.selectExaminer(examiner.id)}
                    aria-pressed={active}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                      {examiner.name}
                      {active && (
                        <Check className="size-3.5 shrink-0 text-brand-600" aria-hidden />
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs font-medium text-brand-600">
                      {examiner.temperament}
                    </span>
                    <span className="mt-1 block text-xs leading-snug text-slate-500">
                      {examiner.description}
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-label={`Écouter ${examiner.name}`}
                    onClick={() => previewExaminer(examiner)}
                    className="grid size-8 shrink-0 place-items-center rounded-pill border border-cream-300 bg-white text-slate-600 transition-colors hover:border-brand-300 hover:text-brand-600"
                  >
                    <Volume2
                      className={cn(
                        "size-3.5",
                        playing === examiner.id && "animate-pulse text-brand-500",
                      )}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Voix système */}
      <div className="flex flex-wrap items-end gap-2.5 border-t border-cream-200 pt-4">
        <label className="min-w-0 flex-1">
          <span className="mb-1.5 block text-xs font-semibold text-slate-500">
            Timbre — voix installée sur cet appareil
          </span>
          <select
            value={voice.selected?.uri ?? ""}
            onChange={(e) => {
              voice.selectVoice(e.target.value);
              preview({ voiceUri: e.target.value });
            }}
            className="h-11 w-full rounded-card border border-cream-300 bg-white px-3.5 text-sm text-slate-800 outline-none transition-colors focus:border-brand-400"
          >
            {voice.voices.map((v) => (
              <option key={v.uri} value={v.uri}>
                {v.label}
                {v.recommended
                  ? " — recommandée"
                  : v.quality === "ancienne"
                    ? " — voix système, timbre synthétique"
                    : ""}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => preview()}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-card border border-cream-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-600"
        >
          <Volume2
            className={cn("size-4", playing === "courant" && "animate-pulse text-brand-500")}
          />
          Écouter
        </button>
      </div>

      {/*
        Cas fréquent sous Windows : seules les anciennes voix SAPI sont là.
        Aucun réglage ne les rendra chaleureuses — autant le dire.
      */}
      {onlyLegacy && (
        <div className="flex items-start gap-2.5 rounded-card border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-800">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Seules d&apos;anciennes voix Windows sont installées ici : leur timbre
            restera synthétique quel que soit le khôlleur choisi. Pour une voix
            féminine vraiment naturelle, ouvre la page dans{" "}
            <strong>Microsoft Edge</strong> (voix « Denise Online (Natural) ») ou
            dans <strong>Chrome</strong> (« Google français »).
          </span>
        </div>
      )}
    </div>
  );
}
