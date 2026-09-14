/**
 * Contrat de la couche voix.
 *
 * Le produit démarre sur la Web Speech API du navigateur (gratuite, immédiate).
 * Ce fichier existe pour que le remplacement ultérieur par un TTS serveur
 * (voix de qualité studio, fichiers audio stockés) ne touche aucun composant :
 * seule l'implémentation change.
 */

export interface SpeakOptions {
  /** Vitesse de lecture. 1 = normal. */
  rate?: number;
  /** Hauteur de voix. 1 = normal. */
  pitch?: number;
  lang?: string;
  /**
   * Force une voix précise, par son `voiceURI`. Sans cette valeur, la meilleure
   * voix française disponible est choisie automatiquement.
   */
  voiceUri?: string;
  onEnd?: () => void;
  onError?: (message: string) => void;
  /** Appelé à chaque mot, pour surligner le texte lu. */
  onBoundary?: (charIndex: number) => void;
}

/** Voix proposée à l'utilisateur, indépendamment de l'API sous-jacente. */
export interface AvailableVoice {
  /** Identifiant stable, utilisé pour mémoriser le choix. */
  uri: string;
  /** Nom nettoyé, présentable dans une liste. */
  label: string;
  lang: string;
  /** Qualité perçue : neuronale, correcte, ou voix système historique. */
  quality: "naturelle" | "standard" | "ancienne";
  /**
   * Vrai uniquement pour la meilleure voix ET si elle mérite d'être conseillée.
   * Une voix système historique n'est jamais recommandée, même si c'est la
   * seule disponible : mieux vaut l'annoncer que la vendre.
   */
  recommended: boolean;
}

export interface SpeechProvider {
  /** Le navigateur ou l'environnement supporte-t-il la synthèse ? */
  readonly isSupported: boolean;
  speak(text: string, options?: SpeakOptions): void;
  pause(): void;
  resume(): void;
  cancel(): void;
  /**
   * Voix françaises disponibles, de la plus adaptée à la moins bonne.
   * `prefer` oriente le classement selon le personnage choisi.
   */
  listVoices(prefer?: "feminine" | "masculine" | "any"): AvailableVoice[];
}

/** Résultat de la détection de capacités, calculée côté client uniquement. */
export interface VoiceCapabilities {
  synthesis: boolean;
  recognition: boolean;
}
