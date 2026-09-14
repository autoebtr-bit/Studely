import "server-only";

/**
 * Choix de modèle et d'effort.
 *
 * Un seul modèle pour toute l'application : le réglage du coût passe par
 * `output_config.effort`, pas par une rétrogradation de modèle. Un modèle
 * unique garde aussi un seul espace de cache de prompt (les caches sont
 * indexés par modèle), ce qu'une cascade multi-modèles ferait perdre.
 */
export const MODEL = "claude-opus-5" as const;

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/**
 * Effort par usage, choisi selon l'enjeu pédagogique :
 *  - extraction et reformulation : peu de jugement, `low` suffit ;
 *  - production d'exercices et de scripts : `medium` ;
 *  - correction de copie, notation d'oral, planification : c'est là que la
 *    qualité se voit, et une erreur coûte cher à l'élève, donc `high`.
 */
export const EFFORT: Record<string, Effort> = {
  chat: "medium",
  flashcards: "low",
  lessonSummary: "low",
  lexicon: "low",
  exercises: "medium",
  podcast: "medium",
  gradeExercise: "high",
  gradeOral: "high",
  studyPlan: "high",

  /**
   * Composer un sujet à partir d'un programme n'est pas la tâche de jugement —
   * la notation l'est. `medium` économise ~20 % du coût d'une khôlle.
   *
   * À surveiller : c'est la première chose que l'élève lit. Si la qualité des
   * sujets baisse, repasser en `high` et chercher l'économie ailleurs.
   */
  kholleSubject: "medium",
};

/**
 * Plafond mensuel de ce que **l'essai gratuit** a le droit de coûter, en
 * dollars. Il ne concerne que lui.
 *
 * Un abonné n'est jamais bloqué : sa consommation est déjà bornée par son quota
 * mensuel, et elle est financée. Un plafond global aurait coupé le service aux
 * clients payants dès que le produit marche — la réussite aurait déclenché la
 * panne.
 *
 * Le risque réellement non borné est la création massive de comptes jetables,
 * chacun emportant ses khôlles offertes. C'est ce que ce plafond arrête.
 *
 * 500 par défaut : un essai complet coûte ~0,93 $, ce qui laisse passer ~540
 * essais par mois — au-dessus d'une croissance normale, en dessous d'une
 * campagne d'abus.
 */
export const FREE_TIER_CEILING_USD = Number(
  process.env.AI_FREE_TIER_CEILING_USD ?? 500,
);

/** Plafonds de sortie : large en streaming, plus serré sinon. */
export const MAX_TOKENS = {
  streaming: 64_000,
  standard: 16_000,
} as const;

/**
 * Tarifs publics de `claude-opus-5`, en dollars par million de jetons.
 *
 * La sortie coûte cinq fois l'entrée, et le raisonnement est facturé en
 * sortie : c'est lui qui décide du coût d'un appel, pas la taille du cours
 * envoyé. D'où le réglage d'effort au cas par cas plutôt qu'un modèle moins
 * cher.
 */
export const PRICING_USD_PER_MTOK = {
  input: 5,
  output: 25,
  /** Relecture de cache : un dixième du tarif d'entrée. */
  cacheRead: 0.5,
  /** Écriture de cache : 1,25 × le tarif d'entrée. */
  cacheWrite: 6.25,
} as const;

export interface TokenUsage {
  /** Jetons d'entrée facturés plein tarif (hors cache). */
  tokensIn: number;
  tokensOut: number;
  cacheRead?: number;
  cacheWrite?: number;
}

/**
 * Coût estimé d'un appel.
 *
 * Le cache compte : le plafond de dépense mensuel s'appuie sur ce chiffre, donc
 * une estimation qui ignore la lecture et l'écriture de cache laisserait passer
 * une dérive réelle.
 */
export function estimateCostUsd({
  tokensIn,
  tokensOut,
  cacheRead = 0,
  cacheWrite = 0,
}: TokenUsage): number {
  const p = PRICING_USD_PER_MTOK;
  return (
    (tokensIn / 1_000_000) * p.input +
    (tokensOut / 1_000_000) * p.output +
    (cacheRead / 1_000_000) * p.cacheRead +
    (cacheWrite / 1_000_000) * p.cacheWrite
  );
}
