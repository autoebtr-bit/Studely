/**
 * Identité canonique d'une adresse e-mail.
 *
 * Sert à n'accorder l'essai gratuit **qu'une fois par personne**. Sans ça,
 * `victor+1@gmail.com`, `victor+2@gmail.com` et `v.i.c.t.o.r@gmail.com`
 * arrivent tous dans la même boîte et ouvrent trois essais.
 *
 * Principe de prudence : un essai vaut ~0,87 €, refuser un vrai élève coûte
 * beaucoup plus cher que d'en laisser passer un malin. À chaque fois qu'il y a
 * un doute, on ne fusionne pas.
 *
 * C'est pourquoi les deux normalisations ci-dessous sont limitées aux
 * fournisseurs où elles sont **documentées** : ailleurs, `a+b@x.fr` et
 * `a.b@x.fr` peuvent être les adresses de deux personnes différentes.
 *
 * Le SQL applique exactement les mêmes règles (`public.canonical_email`), et
 * c'est lui qui fait autorité — ce module sert au retour immédiat côté
 * formulaire. `tests/integration/email-parity.test.ts` garde les deux
 * synchronisés.
 */

/** Fournisseurs où `nom+étiquette@` arrive dans la boîte de `nom@`. */
const PLUS_ADDRESSING_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "outlook.fr",
  "hotmail.com",
  "hotmail.fr",
  "live.com",
  "live.fr",
  "msn.com",
  "yahoo.com",
  "yahoo.fr",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "icloud.com",
  "me.com",
  "fastmail.com",
]);

/** Fournisseurs où les points du nom d'utilisateur sont ignorés. */
const DOT_INSENSITIVE_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

/** Domaines menant à la même boîte que leur équivalent principal. */
const DOMAIN_ALIASES: Record<string, string> = {
  "googlemail.com": "gmail.com",
};

/**
 * Domaines d'adresses jetables les plus courants.
 *
 * Liste volontairement courte : elle sert au message immédiat dans le
 * formulaire. Une liste exhaustive n'existe pas — de nouveaux domaines
 * apparaissent chaque semaine — donc l'autorité est la table
 * `disposable_email_domains`, modifiable sans redéploiement.
 */
export const DISPOSABLE_DOMAINS: readonly string[] = [
  "10minutemail.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "mailinator.com",
  "yopmail.com",
  "yopmail.fr",
  "temp-mail.org",
  "tempmail.com",
  "throwawaymail.com",
  "sharklasers.com",
  "getnada.com",
  "trashmail.com",
  "jetable.org",
  "maildrop.cc",
  "dispostable.com",
  "fakeinbox.com",
  "mohmal.com",
  "emailondeck.com",
  "spamgourmet.com",
  "mytemp.email",
];

const DISPOSABLE = new Set(DISPOSABLE_DOMAINS);

/**
 * Réduit une adresse à l'identité qu'elle désigne réellement.
 * Renvoie `null` si l'adresse n'a pas la forme attendue.
 */
export function canonicalEmail(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();

  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return null;

  let local = trimmed.slice(0, at);
  let domain = trimmed.slice(at + 1);

  if (local.length === 0 || !domain.includes(".")) return null;

  domain = DOMAIN_ALIASES[domain] ?? domain;

  // L'étiquette après « + » ne change pas la boîte de destination.
  if (PLUS_ADDRESSING_DOMAINS.has(domain)) {
    const plus = local.indexOf("+");
    if (plus !== -1) local = local.slice(0, plus);
  }

  if (DOT_INSENSITIVE_DOMAINS.has(domain)) {
    local = local.replaceAll(".", "");
  }

  // Une adresse réduite à rien (« +truc@gmail.com ») n'est pas exploitable.
  if (local.length === 0) return null;

  return `${local}@${domain}`;
}

/** L'adresse relève-t-elle d'un service jetable connu ? */
export function isDisposableDomain(email: string): boolean {
  const canonical = canonicalEmail(email);
  if (!canonical) return false;

  return DISPOSABLE.has(canonical.slice(canonical.lastIndexOf("@") + 1));
}
