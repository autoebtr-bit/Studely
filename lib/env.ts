/**
 * Lecture défensive des variables d'environnement.
 *
 * Volontairement **sans** `server-only` : ces fonctions ne lisent rien
 * d'elles-mêmes, elles reçoivent une valeur déjà lue. Elles doivent surtout
 * rester testables directement, car c'est ici qu'un déploiement se casse.
 *
 * **Le piège que ce module existe pour fermer :** `process.env.X ?? défaut` ne
 * rattrape que `undefined`. Une variable **déclarée mais laissée vide** vaut
 * une chaîne vide, traverse le `??`, et arrive telle quelle dans le code.
 *
 * Ce n'est pas théorique. Les deux fois se sont produites en production, sur le
 * même déploiement :
 *
 * - `new URL("")` a fait échouer le build entier, sur une ligne du gabarit
 *   racine ;
 * - `Number("")` vaut **zéro**, ce qui a mis le plafond de dépense de l'essai
 *   gratuit à 0 $ — le garde-fou censé arrêter les abus fermait le service à
 *   tout le monde.
 *
 * Une variable vide est presque toujours un oubli de remplissage, jamais une
 * intention. On retombe donc sur le défaut, qui est la valeur réfléchie.
 */

/** La valeur porte-t-elle quelque chose ? Sinon `null`. */
export function cleanEnv(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Nombre issu de l'environnement, ou le défaut.
 *
 * Retombe sur le défaut pour une valeur vide, non numérique (`Number("25 $")`
 * vaut `NaN`) ou négative. `NaN` mérite une attention particulière : toute
 * comparaison avec lui est fausse, si bien qu'un plafond à `NaN` ne serait pas
 * « trop haut » mais **inexistant** — il ne déclencherait jamais.
 */
export function numberEnv(value: string | undefined, fallback: number): number {
  const brut = cleanEnv(value);
  if (!brut) return fallback;

  const nombre = Number(brut);
  return Number.isFinite(nombre) && nombre > 0 ? nombre : fallback;
}
