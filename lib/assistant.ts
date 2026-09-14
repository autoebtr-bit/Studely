/**
 * L'assistant du site.
 *
 * « Prof IA » était une étiquette de catégorie, pas un nom : personne ne dit
 * « je vais demander au prof IA ». Un prénom crée une relation et retire de
 * l'interface un vocabulaire de logiciel.
 *
 * Le nom est **fixe** — il n'est pas personnalisable. C'est ce qui permet de le
 * lire depuis un composant serveur comme depuis la vitrine, sans stockage local
 * ni précaution d'hydratation.
 *
 * Source unique : ne jamais réécrire « Kollia » en dur ailleurs, sinon un
 * changement de nom laisserait des restes.
 */
export const ASSISTANT = {
  name: "Kollia",
  /** Ce que Kollia fait, en une ligne, pour les sous-titres et la recherche. */
  role: "Débloque une notion",
} as const;
