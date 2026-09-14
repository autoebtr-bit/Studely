"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Reconnaissance vocale via la Web Speech API.
 *
 * Firefox n'implémente pas `SpeechRecognition` : `isSupported` vaut alors
 * `false` et l'appelant DOIT proposer une saisie texte de repli. On ne laisse
 * jamais un bouton micro visible mais inerte.
 */

// L'API n'est pas dans les typings DOM standard : on décrit le minimum utilisé.
interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
  length: number;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}
interface SpeechRecognitionErrorEventLike {
  error: string;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed":
    "Accès au micro refusé. Autorise le microphone dans les réglages du navigateur.",
  "service-not-allowed":
    "Le service de reconnaissance vocale est indisponible sur cet appareil.",
  "no-speech": "Aucune parole détectée. Réessaie en parlant plus près du micro.",
  network: "La reconnaissance vocale nécessite une connexion internet.",
  aborted: "",
};

export interface UseSpeechRecognitionResult {
  /** `false` sur Firefox et en rendu serveur : prévoir une saisie texte. */
  isSupported: boolean;
  isListening: boolean;
  /** Texte confirmé depuis le dernier `reset()`. */
  transcript: string;
  /** Texte en cours de reconnaissance, non encore confirmé. */
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechRecognition(lang = "fr-FR"): UseSpeechRecognitionResult {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Évite de relancer la reconnaissance quand c'est l'utilisateur qui a arrêté.
  const wantsToListenRef = useRef(false);

  // La détection doit avoir lieu après montage : au rendu serveur `window`
  // n'existe pas, et un `isSupported` initial à `true` ferait clignoter l'UI.
  useEffect(() => {
    setIsSupported(getRecognitionCtor() !== null);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("La reconnaissance vocale n'est pas disponible dans ce navigateur.");
      return;
    }
    if (recognitionRef.current) return;

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        const text = result[0].transcript;
        if (result.isFinal) finalChunk += text;
        else interimChunk += text;
      }

      if (finalChunk) {
        setTranscript((prev) => (prev ? `${prev} ${finalChunk.trim()}` : finalChunk.trim()));
      }
      setInterim(interimChunk);
    };

    recognition.onerror = (event) => {
      const message = ERROR_MESSAGES[event.error];
      // Une chaîne vide signale une erreur bénigne qu'on n'affiche pas.
      if (message !== "") {
        setError(message ?? `Erreur de reconnaissance vocale (${event.error}).`);
      }
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        wantsToListenRef.current = false;
      }
    };

    recognition.onend = () => {
      // `continuous` s'interrompt tout de même après un silence : on relance
      // tant que l'utilisateur n'a pas explicitement arrêté.
      if (wantsToListenRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          // Relance impossible : on retombe sur l'arrêt propre ci-dessous.
        }
      }
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    wantsToListenRef.current = true;
    setError(null);

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setError("Impossible de démarrer le micro.");
      recognitionRef.current = null;
      wantsToListenRef.current = false;
    }
  }, [lang]);

  const stop = useCallback(() => {
    wantsToListenRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterim("");
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterim("");
    setError(null);
  }, []);

  // Coupe le micro si le composant disparaît : sans cela l'écoute continue.
  useEffect(() => {
    return () => {
      wantsToListenRef.current = false;
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  return { isSupported, isListening, transcript, interim, error, start, stop, reset };
}
