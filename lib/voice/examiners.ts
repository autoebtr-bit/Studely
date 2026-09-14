/**
 * Les khôlleurs.
 *
 * Ce fichier remplace l'ancien catalogue de « personnages de voix », qui
 * portait des noms de réglages — « Douce », « Exigeante ». Un étudiant de prépa
 * ne choisit pas un débit de parole : il a un khôlleur, il le connaît, il
 * l'appelle par son nom.
 *
 * Le khôlleur est distinct de l'assistant (`lib/assistant.ts`) : Kollia répond
 * par écrit, le khôlleur fait passer l'oral. Deux rôles, deux personnages.
 *
 * **Deux choix, pas davantage** : une voix féminine et une voix masculine. Le
 * timbre, lui, reste réglable séparément dans les paramètres de voix — c'est là
 * que se fait le réglage fin, pas ici.
 */

/** Genre de voix privilégié lors de la sélection automatique. */
export type VoicePreference = "feminine" | "masculine" | "any";

export type Examiner = {
  id: string;
  /** Prénom affiché partout où le personnage s'exprime. */
  name: string;
  /**
   * Le prénom précédé de « de », élidé si besoin : « la fiche d'Hélène ».
   *
   * Écrit à la main plutôt que déduit : l'élision dépend du h muet ou aspiré,
   * que l'orthographe seule ne permet pas de trancher (« d'Hélène » mais
   * « de Henri »). Avec deux personnages, la table est plus sûre qu'une règle.
   */
  possessive: string;
  /** Tempérament, en deux ou trois mots. */
  temperament: string;
  /** Ce que ça change concrètement pendant la khôlle. */
  description: string;
  prefer: VoicePreference;
  /** Multiplicateur de débit. 1 = vitesse nominale du moteur. */
  rate: number;
  /** Hauteur. 1 = hauteur nominale. */
  pitch: number;
};

/**
 * Les deux réglages de voix se manipulent avec retenue :
 *  - le débit fait l'essentiel du caractère. Légèrement sous la normale, la
 *    diction s'adoucit sans traîner.
 *  - la hauteur reste dans ±0,08. Au-delà, la voix devient caricaturale, et
 *    c'est précisément ce qui rend une synthèse agaçante.
 *
 * Les prénoms sont ceux d'enseignants plausibles, pas de mascottes : le produit
 * s'adresse à des étudiants qui jouent un concours.
 */
export const EXAMINERS: Examiner[] = [
  {
    id: "helene",
    name: "Hélène",
    possessive: "d'Hélène",
    temperament: "Posée et bienveillante",
    description:
      "Elle laisse chercher, ne coupe qu'au besoin, et reformule quand tu t'égares. Le choix le moins fatigant sur une longue séance.",
    prefer: "feminine",
    rate: 0.92,
    pitch: 1.02,
  },
  {
    id: "vincent",
    name: "Vincent",
    possessive: "de Vincent",
    temperament: "Calme, voix grave",
    description:
      "Même exigence, timbre masculin plus bas. Si l'appareil n'a pas de voix d'homme, la meilleure voix disponible est abaissée.",
    prefer: "masculine",
    rate: 0.95,
    pitch: 0.94,
  },
];

export const DEFAULT_EXAMINER_ID = "helene";

const BY_ID = new Map(EXAMINERS.map((e) => [e.id, e]));

export function getExaminer(id: string | null | undefined): Examiner {
  return (id ? BY_ID.get(id) : undefined) ?? BY_ID.get(DEFAULT_EXAMINER_ID)!;
}

/** Prénom du khôlleur par défaut, pour les textes rendus côté serveur. */
export const DEFAULT_EXAMINER_NAME = getExaminer(DEFAULT_EXAMINER_ID).name;
