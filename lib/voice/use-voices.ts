"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AvailableVoice, SpeakOptions } from "./types";
import { ensureVoicesLoaded, speechProvider } from "./web-speech-tts";
import {
  DEFAULT_EXAMINER_ID,
  EXAMINERS,
  getExaminer,
  type Examiner,
} from "./examiners";

const VOICE_KEY = "studely.voix";
const EXAMINER_KEY = "studely.kholleur";

/** Lecture tolérante : navigation privée, stockage bloqué, autre navigateur… */
function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Préférence de confort : son échec ne doit rien interrompre.
  }
}

export interface UseVoicesResult {
  /** `null` tant que la détection n'a pas eu lieu (rendu serveur inclus). */
  supported: boolean | null;
  /** Vrai tant que le catalogue peut encore se remplir. */
  loading: boolean;
  voices: AvailableVoice[];
  /** Voix système active, ou `undefined` si aucune n'est disponible. */
  selected: AvailableVoice | undefined;
  selectVoice: (uri: string) => void;

  examiners: Examiner[];
  examiner: Examiner;
  selectExaminer: (id: string) => void;

  /**
   * Réglages prêts à passer à `speechProvider.speak`.
   * Centraliser ici évite que chaque écran réapplique le khôlleur à sa façon.
   */
  speakOptions: Pick<SpeakOptions, "voiceUri" | "rate" | "pitch">;
}

/**
 * Instants de relance du catalogue, en millisecondes.
 * Certains navigateurs n'émettent jamais `voiceschanged` ; quelques relectures
 * espacées coûtent moins cher qu'une interface qui affirme à tort qu'aucune
 * voix n'est installée.
 */
const RETRY_DELAYS = [300, 900, 1800, 3000] as const;

/** Au-delà de ce délai, une liste vide traduit une absence réelle de voix. */
const SETTLE_DELAY_MS = 3200;

/**
 * Voix de synthèse disponibles, khôlleur choisi, et réglages qui en découlent.
 *
 * Deux niveaux de choix, volontairement distincts : le khôlleur décide du
 * caractère (débit, hauteur, genre recherché), la voix système décide du timbre.
 * Changer de khôlleur resélectionne la voix la mieux adaptée ; l'élève peut
 * ensuite forcer une autre voix s'il préfère.
 */
export function useVoices(): UseVoicesResult {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [examinerId, setExaminerId] = useState<string>(DEFAULT_EXAMINER_ID);
  const [voices, setVoices] = useState<AvailableVoice[]>([]);
  const [selectedUri, setSelectedUri] = useState<string | null>(null);

  const examiner = useMemo(() => getExaminer(examinerId), [examinerId]);

  // Le khôlleur mémorisé est lu avant tout, car il oriente la sélection.
  useEffect(() => {
    const stored = read(EXAMINER_KEY);
    if (stored) setExaminerId(stored);
  }, []);

  useEffect(() => {
    let cancelled = false;

    /**
     * Relit le catalogue pour le khôlleur courant.
     *
     * Doit pouvoir être rappelé : selon le navigateur, les voix arrivent bien
     * après le premier rendu. Une lecture unique laisserait l'interface
     * afficher « aucune voix disponible » définitivement.
     */
    function refresh() {
      if (cancelled) return;

      const available = speechProvider.listVoices(examiner.prefer);
      setSupported(speechProvider.isSupported);
      setVoices(available);
      if (available.length > 0) setLoading(false);

      setSelectedUri((current) => {
        if (current && available.some((v) => v.uri === current)) return current;

        const stored = read(VOICE_KEY);
        if (stored && available.some((v) => v.uri === stored)) return stored;

        return available[0]?.uri ?? null;
      });
    }

    void ensureVoicesLoaded().then(refresh);

    const synth =
      typeof window !== "undefined" && "speechSynthesis" in window
        ? window.speechSynthesis
        : null;
    synth?.addEventListener("voiceschanged", refresh);

    const timers = RETRY_DELAYS.map((delay) => window.setTimeout(refresh, delay));
    const settle = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, SETTLE_DELAY_MS);

    return () => {
      cancelled = true;
      synth?.removeEventListener("voiceschanged", refresh);
      timers.forEach((id) => window.clearTimeout(id));
      window.clearTimeout(settle);
    };
  }, [examiner.prefer]);

  const selectVoice = useCallback((uri: string) => {
    setSelectedUri(uri);
    write(VOICE_KEY, uri);
  }, []);

  const selectExaminer = useCallback((id: string) => {
    setExaminerId(id);
    write(EXAMINER_KEY, id);
    // Le khôlleur change le genre recherché : on laisse la resélection
    // automatique reprendre la main plutôt que de garder un choix devenu
    // incohérent (une voix féminine pour Vincent).
    setSelectedUri(null);
  }, []);

  const selected = voices.find((v) => v.uri === selectedUri);

  return {
    supported,
    loading,
    voices,
    selected,
    selectVoice,
    examiners: EXAMINERS,
    examiner,
    selectExaminer,
    speakOptions: {
      voiceUri: selected?.uri,
      rate: examiner.rate,
      pitch: examiner.pitch,
    },
  };
}
