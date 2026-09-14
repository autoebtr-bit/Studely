/**
 * Le tempo des relances.
 *
 * Ces deux constantes vivaient dans `kholle-workspace.tsx`. Elles sont ici
 * parce que **la vitrine les annonce** : « après quatre secondes de silence, il
 * décide s'il te coupe ». Laissées dans le composant, changer le délai du
 * moteur aurait laissé la page promettre l'ancien.
 *
 * C'est le même principe que `filieres-section.tsx`, qui lit `KHOLLE_FORMATS`
 * pour ne pas pouvoir annoncer un format que le moteur ne sait pas jouer.
 */

/**
 * Silence après lequel le khôlleur envisage d'intervenir, en millisecondes.
 *
 * Un khôlleur n'interrompt pas au hasard : il attend une respiration. Trop
 * court, on coupe la parole au milieu d'un raisonnement ; trop long, la relance
 * arrive quand l'élève est déjà passé à autre chose.
 */
export const PAUSE_BEFORE_RELANCE_MS = 4000;

/**
 * Longueur minimale de nouveau discours avant d'envisager une relance.
 *
 * Sans ce seuil, une hésitation de deux mots déclencherait une intervention.
 */
export const MIN_CHARS_BEFORE_RELANCE = 140;

/** Le délai en secondes, tel qu'il s'écrit dans une phrase. */
export const PAUSE_BEFORE_RELANCE_S = Math.round(PAUSE_BEFORE_RELANCE_MS / 1000);
