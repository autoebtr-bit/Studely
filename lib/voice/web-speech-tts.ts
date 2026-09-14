"use client";

import type { AvailableVoice, SpeakOptions, SpeechProvider } from "./types";
import type { VoicePreference } from "./examiners";
import {
  PODCAST_VOICE_SETTINGS,
  pickBestFrenchVoice,
  prettyVoiceName,
  rankFrenchVoices,
  voiceQuality,
} from "./voice-catalog";

/**
 * Synthèse vocale via `window.speechSynthesis`.
 *
 * Trois pièges de l'API contournés ici :
 *  - la liste des voix est peuplée de façon asynchrone (`voiceschanged`) ;
 *  - Chrome met la synthèse en pause au bout d'environ 15 secondes si on ne
 *    la relance pas ; d'où le « keep-alive » périodique ;
 *  - l'ordre des voix est arbitraire : prendre la première venue donne la
 *    vieille voix SAPI de Windows, très synthétique. Le classement est délégué
 *    à `voice-catalog.ts`.
 */
class WebSpeechTts implements SpeechProvider {
  private utterance: SpeechSynthesisUtterance | null = null;
  private keepAliveId: number | null = null;

  get isSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  private allVoices(): SpeechSynthesisVoice[] {
    if (!this.isSupported) return [];
    return window.speechSynthesis.getVoices();
  }

  listVoices(prefer: VoicePreference = "feminine"): AvailableVoice[] {
    const ranked = rankFrenchVoices(this.allVoices(), prefer);
    return ranked.map((voice, index) => {
      const quality = voiceQuality(voice);
      return {
        uri: voice.voiceURI,
        label: prettyVoiceName(voice),
        lang: voice.lang,
        quality,
        // La première du classement n'est mise en avant que si elle vaut la
        // peine d'être écoutée. Sinon on n'annonce rien.
        recommended: index === 0 && quality !== "ancienne",
      };
    });
  }

  /** Voix demandée si elle existe encore, sinon la meilleure disponible. */
  private resolveVoice(voiceUri?: string): SpeechSynthesisVoice | null {
    const voices = this.allVoices();
    if (voices.length === 0) return null;

    if (voiceUri) {
      // La voix mémorisée peut avoir disparu (autre machine, autre navigateur).
      const exact = voices.find((v) => v.voiceURI === voiceUri);
      if (exact) return exact;
    }

    return pickBestFrenchVoice(voices);
  }

  speak(text: string, options: SpeakOptions = {}): void {
    if (!this.isSupported) {
      options.onError?.("La synthèse vocale n'est pas disponible dans ce navigateur.");
      return;
    }

    this.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang ?? PODCAST_VOICE_SETTINGS.lang;
    utterance.rate = options.rate ?? PODCAST_VOICE_SETTINGS.rate;
    utterance.pitch = options.pitch ?? PODCAST_VOICE_SETTINGS.pitch;

    const voice = this.resolveVoice(options.voiceUri);
    if (voice) {
      utterance.voice = voice;
      // Aligner la langue sur celle de la voix : un décalage fait basculer
      // certains navigateurs sur une voix de repli, souvent la plus mauvaise.
      utterance.lang = voice.lang;
    }

    utterance.onend = () => {
      this.stopKeepAlive();
      options.onEnd?.();
    };
    utterance.onerror = (event) => {
      this.stopKeepAlive();
      // « interrupted » et « canceled » viennent de nos propres appels à cancel().
      if (event.error === "interrupted" || event.error === "canceled") return;
      options.onError?.(`Lecture impossible (${event.error}).`);
    };
    if (options.onBoundary) {
      utterance.onboundary = (event) => options.onBoundary?.(event.charIndex);
    }

    this.utterance = utterance;
    window.speechSynthesis.speak(utterance);
    this.startKeepAlive();
  }

  pause(): void {
    if (!this.isSupported) return;
    window.speechSynthesis.pause();
    this.stopKeepAlive();
  }

  resume(): void {
    if (!this.isSupported) return;
    window.speechSynthesis.resume();
    this.startKeepAlive();
  }

  cancel(): void {
    if (!this.isSupported) return;
    this.stopKeepAlive();
    window.speechSynthesis.cancel();
    this.utterance = null;
  }

  /** Contourne la coupure automatique de Chrome au-delà de ~15 s. */
  private startKeepAlive(): void {
    this.stopKeepAlive();
    this.keepAliveId = window.setInterval(() => {
      const synth = window.speechSynthesis;
      if (synth.speaking && !synth.paused) {
        synth.pause();
        synth.resume();
      }
    }, 10_000);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveId !== null) {
      window.clearInterval(this.keepAliveId);
      this.keepAliveId = null;
    }
  }
}

/**
 * Charge les voix disponibles. La première invocation renvoie souvent une liste
 * vide : on attend alors l'événement `voiceschanged`.
 */
export function ensureVoicesLoaded(): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return Promise.resolve();
  }
  if (window.speechSynthesis.getVoices().length > 0) return Promise.resolve();

  return new Promise((resolve) => {
    const done = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", done);
      resolve();
    };
    window.speechSynthesis.addEventListener("voiceschanged", done);
    // Filet de sécurité : certains navigateurs n'émettent jamais l'événement.
    window.setTimeout(done, 1500);
  });
}

export const speechProvider: SpeechProvider = new WebSpeechTts();
