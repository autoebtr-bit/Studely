/**
 * Choix de la voix de synthèse.
 *
 * La Web Speech API expose toutes les voix installées sur la machine, dans un
 * ordre arbitraire. Prendre la première voix française venue donne, sur
 * Windows, la vieille voix SAPI « Hortense » — d'où l'impression robotique.
 *
 * Ce fichier classe les voix disponibles pour retenir la plus naturelle :
 * une voix féminine française, douce, non métallique. La logique est pure et
 * testée, car elle décide de la qualité perçue de tout le module Podcast.
 *
 * Limite assumée : on ne peut choisir que parmi ce que la machine possède.
 * Pour une voix de qualité studio garantie, il faut un TTS serveur — c'est
 * précisément ce que l'interface `SpeechProvider` permettra de brancher.
 */

import type { VoicePreference } from "./examiners";

/** Sous-ensemble de `SpeechSynthesisVoice` nécessaire au classement. */
export interface VoiceLike {
  name: string;
  lang: string;
  localService?: boolean;
  default?: boolean;
}

/**
 * Voix féminines françaises reconnues, de la plus naturelle à la moins bonne.
 * La comparaison est faite en minuscules, sur une inclusion de sous-chaîne.
 */
const PREFERRED_FEMALE = [
  // Chrome, toutes plateformes — la plus naturelle et la plus répandue.
  "google français",
  "google france",
  // Edge / Windows 11 — voix neuronales « Online (Natural) ».
  "denise",
  "vivienne",
  "coralie",
  "jacqueline",
  "yvette",
  // macOS et iOS — voix premium.
  "audrey",
  "marie",
  "amélie",
  "amelie",
  "aurélie",
  "aurelie",
  "chantal",
  // Android.
  "française",
] as const;

/** Voix masculines : écartées, la consigne produit est une voix féminine. */
const MALE_NAMES = [
  "thomas",
  "henri",
  "paul",
  "nicolas",
  "claude",
  "daniel",
  "mathieu",
  "antoine",
  "alain",
  "guillaume",
  "jean",
  "rémy",
  "remy",
] as const;

/**
 * Voix connues pour leur rendu métallique.
 * « Hortense » est l'ancienne voix SAPI5 de Windows : c'est elle qui produit
 * la diction robotique que l'on cherche à éviter.
 */
const ROBOTIC_NAMES = ["hortense", "julie", "espeak", "pico", "festival"] as const;

const includesAny = (haystack: string, needles: readonly string[]): boolean =>
  needles.some((n) => haystack.includes(n));

/**
 * Note une voix. Plus le score est élevé, plus la voix est adaptée.
 * `null` signifie « inutilisable ici » (langue non française).
 *
 * `prefer` oriente la sélection sans jamais exclure : un personnage qui demande
 * une voix grave doit rester utilisable sur une machine qui n'en propose aucune,
 * quitte à abaisser la hauteur ensuite.
 */
export function scoreVoice(
  voice: VoiceLike,
  prefer: VoicePreference = "feminine",
): number | null {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.replace("_", "-").toLowerCase();

  if (!lang.startsWith("fr")) return null;

  let score = 0;

  // Variante de français : la France d'abord, les autres restent acceptables.
  score += lang.startsWith("fr-fr") ? 40 : 15;

  // Rang dans la liste des voix féminines connues.
  const rank = PREFERRED_FEMALE.findIndex((n) => name.includes(n));
  if (rank !== -1) score += 120 - rank * 6;

  // Les voix neuronales modernes s'annoncent « Natural » ou « Online ».
  if (name.includes("natural")) score += 45;
  if (name.includes("online")) score += 25;

  // « Desktop » désigne les anciennes voix SAPI, nettement plus synthétiques.
  if (name.includes("desktop")) score -= 55;

  if (includesAny(name, ROBOTIC_NAMES)) score -= 90;

  // Orientation par genre, jamais éliminatoire.
  const isKnownMale = includesAny(name, MALE_NAMES);
  const isKnownFemale = rank !== -1;

  if (prefer === "feminine" && isKnownMale) score -= 100;
  if (prefer === "masculine") {
    if (isKnownMale) score += 110;
    else if (isKnownFemale) score -= 40;
  }

  // Une voix distante est presque toujours de meilleure facture qu'une voix
  // embarquée — au prix d'une connexion, d'où un bonus modéré.
  if (voice.localService === false) score += 20;

  return score;
}

/**
 * Niveau de qualité perçue d'une voix.
 *
 * Sert à ne pas présenter comme « recommandée » la moins mauvaise d'un lot
 * médiocre : quand toutes les voix installées sont des voix système
 * historiques, il faut le dire plutôt que d'en promouvoir une.
 */
export type VoiceQuality = "naturelle" | "standard" | "ancienne";

export function voiceQuality(voice: VoiceLike): VoiceQuality {
  const name = voice.name.toLowerCase();
  const isNeural = name.includes("natural") || name.includes("online");

  // Les voix neuronales et les voix distantes sont les seules réellement
  // naturelles à l'oreille.
  if (isNeural || name.includes("google") || voice.localService === false) {
    return "naturelle";
  }

  if (includesAny(name, ROBOTIC_NAMES) || name.includes("desktop")) {
    return "ancienne";
  }

  // Une voix Microsoft embarquée qui ne s'annonce ni « Natural » ni « Online »
  // est une voix SAPI/OneCore historique, quel que soit son prénom.
  if (name.includes("microsoft")) return "ancienne";

  return "standard";
}

/** Voix françaises utilisables, de la meilleure à la moins bonne. */
export function rankFrenchVoices<T extends VoiceLike>(
  voices: readonly T[],
  prefer: VoicePreference = "feminine",
): T[] {
  return voices
    .map((voice) => ({ voice, score: scoreVoice(voice, prefer) }))
    .filter((entry): entry is { voice: T; score: number } => entry.score !== null)
    .sort((a, b) => b.score - a.score || a.voice.name.localeCompare(b.voice.name))
    .map((entry) => entry.voice);
}

/**
 * Meilleure voix disponible, ou `null` si la machine n'en propose aucune en
 * français — l'appelant laisse alors le navigateur décider.
 */
export function pickBestFrenchVoice<T extends VoiceLike>(
  voices: readonly T[],
  prefer: VoicePreference = "feminine",
): T | null {
  return rankFrenchVoices(voices, prefer)[0] ?? null;
}

/** Nom lisible d'une voix, débarrassé du bruit technique des libellés système. */
export function prettyVoiceName(voice: VoiceLike): string {
  return voice.name
    .replace(/^Microsoft\s+/i, "")
    .replace(/\s*Online\s*\(Natural\)\s*/i, " ")
    .replace(/\s*-\s*French.*$/i, "")
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s*Desktop\s*/i, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Réglages de lecture du podcast.
 *
 * Un débit légèrement sous la normale adoucit nettement la diction ; toucher
 * à la hauteur, en revanche, rend vite la voix caricaturale — on la laisse
 * neutre.
 */
export const PODCAST_VOICE_SETTINGS = {
  rate: 0.95,
  pitch: 1,
  lang: "fr-FR",
} as const;
