# Notes pour Claude Code

Contexte projet : voir `README.md`. Ce fichier ne contient que ce qui n'est pas
déductible du code, et les pièges déjà rencontrés.

## Environnement

- Windows. Node installé via winget ; **le PATH mis à jour n'est pas repris par
  les nouveaux shells** de cette session. Préfixer chaque commande par :
  `$env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User");`
- Le dossier du projet s'appelle `Student AI` (majuscules et espace), ce qui
  n'est pas un nom npm valide. `create-next-app` échoue dessus — le projet a
  été scaffoldé à la main, et `package.json` déclare `"name": "student-ai"`.

## Pièges déjà payés

- **Types Supabase** : utiliser des alias `type`, jamais `interface`. Une
  interface n'a pas d'index signature implicite, ne satisfait donc pas
  `GenericSchema`, et toutes les requêtes se résolvent silencieusement en
  `never`.
- **`Map` de lucide-react** masque le constructeur global `Map`. L'importer
  sous `MapIcon`.
- **ESLint Next interdit une variable nommée `module`.** Dans
  `app/(app)/[module]/page.tsx`, la variable locale s'appelle `mod`.
- **`useSearchParams()` impose une frontière `<Suspense>`** sinon le build de
  production échoue au prérendu (`/login`, `/signup`).
- **Éléments flex** : un enfant en `flex-1` garde `min-width: auto` et refuse de
  rétrécir sous la largeur de son texte. Sans `min-w-0`, il pousse ses voisins
  hors de l'écran. Le test E2E de débordement mobile garde contre ce cas.
- **SDK Anthropic** : `messages.parse`, `output_config` et `helpers/zod`
  n'existent qu'à partir des versions récentes ; le helper importe `zod/v4`,
  d'où zod v4 dans le projet.
- **Ne jamais rebuilder pendant qu'un `next start` tourne.** Le serveur garde en
  mémoire l'ancien manifeste et sert du HTML qui référence des chunks JS
  supprimés par le nouveau build. Le navigateur affiche alors « Application
  error: a client-side exception has occurred » alors que le code est sain.
  Arrêter le serveur, rebuilder, puis relancer.
- **Un HTTP 200 ne prouve rien sur l'hydratation.** Une page dont le JS casse
  répond quand même 200. `tests/e2e/runtime-health.spec.ts` charge chaque page
  dans un vrai navigateur et échoue à la moindre erreur console ou requête
  ratée — c'est ce test qui couvre cette classe de panne, pas un `curl`.
- **Toute route qui appelle le modèle doit déclarer `maxDuration`.** La limite
  par défaut en production est de dix secondes ; une génération d'Opus les
  dépasse systématiquement. En local rien ne s'en aperçoit — la panne
  n'apparaît qu'une fois déployé. 60 s est le plafond des offres d'entrée :
  demander plus fait rejeter la valeur au lieu de l'accorder.
  `tests/integration/route-config.test.ts` garde contre l'oubli.
- **Une route d'API ne se protège pas par une redirection.** `fetch` suit les
  redirections en silence : rediriger `/api/...` vers `/login` fait recevoir au
  client la page de connexion **en HTML avec un statut 200**. Le flux du chat
  la recopiait telle quelle dans la bulle de réponse. Le middleware répond donc
  401 en JSON sous `/api/`, et `lib/api/ai.ts` vérifie en plus le
  `Content-Type` avant de lire ou de diffuser quoi que ce soit.
- **Le corps d'une requête est plafonné à ~4,5 Mo en production.** Un fichier de
  20 Mo encodé en base64 en fait ~27 : il ne peut donc pas transiter par une
  route d'API. Le navigateur téléverse vers Supabase Storage, et la route relit
  le fichier depuis le stockage — c'est la seule chaîne qui fonctionne, pas un
  raffinement.

## Design

- **Une seule identité** pour la landing et l'application. Un écran ne doit
  jamais introduire sa propre couleur : passer par les tokens
  (`brand`, `blush`, `accent`, `cream`, `ink`) et par
  `lib/modules/gradients.ts` pour les pavés.
- **Pas de style dans le JSX.** Les effets de marque vivent dans
  `app/styles/*.css`, importés par `globals.css` (`postcss-import` les inline
  avant Tailwind — ne pas retirer ce plugin).
- **Mobile d'abord.** Toute nouvelle page doit passer le test de débordement
  horizontal à 375 px (`tests/e2e/revision.spec.ts`).
- **Textes de la landing dans `lib/marketing/content.ts`**, jamais en dur dans
  un composant : les sections bouclent sur ces données.
- **Les chiffres de la vitrine se dérivent du moteur, jamais recopiés.**
  `difference-section.tsx` lit `KHOLLE_FORMATS` et `lib/kholle/timing.ts`,
  comme `filieres-section.tsx` lit les formats : changer un réglage du produit
  met la page à jour toute seule, au lieu de la laisser annoncer l'ancien.
- **Aucun concurrent nommé sur la vitrine.** La différence se démontre par la
  précision des mécanismes — « quatre secondes de silence », « 40 et 60 % de la
  note ». Un comparatif nominatif est défensif et se périme.
- **Ne rien promettre qui suppose un historique** tant que les khôlles ne sont
  pas enregistrées : ni progression, ni courbe, ni séances précédentes. Trois
  tests de `navigation.spec.ts` gardent ces deux règles.
- **Apparition au défilement** : poser `data-reveal` ou `data-reveal-group`,
  jamais d'opacité dans le JSX. L'état masqué dépend de la classe `js-reveal`,
  posée avant le premier rendu par le script de
  `lib/marketing/reveal-script.ts` — sans lui, tout reste visible. Ne jamais
  masquer depuis un composant client : le HTML serveur arriverait visible,
  l'hydratation le masquerait, et le contenu clignoterait.
  `tests/e2e/reveal.spec.ts` vérifie qu'aucun bloc ne reste invisible après
  avoir parcouru la page.

## Données de l'application

- **Aucune donnée fictive dans l'application.** `lib/mock/` a été supprimé : les
  écrans lisent `lib/data/*.ts`, qui interrogent Supabase sous RLS. Les seules
  données inventées qui subsistent sont celles de la **vitrine**, dans
  `lib/marketing/content.ts`, et elles sont étiquetées comme exemples.
- **Un compte neuf n'a rien, et c'est l'état à soigner.** Tout écran doit avoir
  son `EmptyState` (`components/ui/empty-state.tsx`) : ce qui viendra s'y
  afficher, et l'action qui le remplit. Un écran vide qui ressemble à une panne
  fait partir l'élève avant sa première khôlle. Deux tests E2E de
  `revision.spec.ts` gardent cette règle, y compris « jamais d'impasse ».
- **Les lectures ne lèvent jamais.** Chaque fonction de `lib/data/` renvoie une
  valeur vide en cas d'échec : l'absence de données est la situation normale
  d'un nouvel inscrit, pas une panne, et un écran d'erreur serait pire.
- **`server-only` ne franchit pas la frontière client.** Les formes et libellés
  partagés vivent dans `lib/data/types.ts`, **sans** cette directive ; les
  requêtes restent dans les modules serveur. Importer une valeur d'un module
  `server-only` depuis un composant client fait échouer le build.
- **La suite E2E tourne sans Supabase** (`playwright.config.ts` vide les deux
  variables) : elle couvre l'expérience d'un compte sans données. Les parcours
  qui exigent des données réelles demanderont un compte de test alimenté.

## Règles à ne pas casser

- **L'XP ne s'attribue jamais depuis le client.** Passer par la RPC `award_xp`,
  qui calcule le montant serveur, applique le plafond journalier et déduplique.
  Un composant peut *prédire* un gain pour l'animer, jamais l'écrire.
- **RLS sur chaque nouvelle table**, sans exception, écrite dans la même
  migration que la table.
- **`import "server-only"`** en tête de tout fichier touchant une clé d'API.
  Aucune clé secrète en `NEXT_PUBLIC_*`.
- **Prompts système constants** (`lib/ai/prompts.ts`) : aucune date, aucun id,
  sinon le cache de prompt est invalidé à chaque appel.
- **Un seul modèle** : `claude-opus-5`. Régler le coût par
  `output_config.effort`, pas en rétrogradant le modèle.
- **Toute nouvelle règle d'XP** doit être ajoutée des deux côtés —
  `lib/xp/rules.ts` et `supabase/seed.sql` — sinon
  `tests/integration/xp-parity.test.ts` échoue (c'est voulu).
- **Les volumes des offres se changent des deux côtés** — `lib/billing/plans.ts`
  et la migration `0008_kholle_quotas.sql` — sinon
  `tests/integration/plan-parity.test.ts` échoue (c'est voulu). Ne jamais
  réécrire un quota en toutes lettres dans un composant : la vitrine et l'écran
  des paramètres lisent `lib/billing/plans.ts`.
- **Une khôlle vaut UNE unité**, réservée au lancement du sujet. La notation ne
  consomme rien : un élève coupé avant sa fiche aurait perdu vingt minutes
  d'oral pour rien. `guardAiRoute(..., null)` sert à ça — authentifier et
  valider sans débiter.
- **Ne jamais promettre d'illimité.** Une khôlle coûte ~0,33 € d'API
  (`claude-opus-5` facture la sortie 25 $/M, raisonnement compris). Tout volume
  annoncé doit exister dans `plan_limits`.
- **Le gratuit est un essai, pas un plan.** `KHOLLES_OFFERTES` khôlles offertes
  — trois aujourd'hui, et ce nombre ne se recopie nulle part : le lire dans
  `lib/billing/plans.ts` évite qu'un texte annonce un chiffre que le code
  n'applique pas. Ensuite plus aucun appel au modèle : les trois compteurs du
  plan `gratuit` valent zéro, et
  `plan-parity.test.ts` le verrouille. En rouvrir un, même à 1 par jour, rend le
  coût d'un compte non converti récurrent et sans plafond mensuel.
- **La note globale d'une khôlle se calcule, ne se saisit pas.**
  `weightedScore` (`lib/kholle/history.ts`) la dérive des critères et de leurs
  poids, y compris sur la réponse du modèle : rien ne garantit que son addition
  tombe juste, et une fiche annonçant 14,5 au-dessus de critères qui font 13,6
  se fait démonter par le premier élève qui vérifie. Même règle pour les
  chiffres d'exemple de la vitrine — `plan-parity` les recalcule.
- **L'essai ne s'accorde qu'une fois par identité, pas par adresse.**
  `public.canonical_email` assimile les étiquettes `+` et les points Google ;
  `trial_grants` mémorise l'attribution **sans clé étrangère vers `profiles`**,
  pour que supprimer son compte ne redonne pas l'essai. Toute règle ajoutée
  côté TypeScript (`lib/auth/email.ts`) doit l'être en SQL — `email-parity`
  échoue sinon. Rester prudent : refuser un vrai élève coûte bien plus cher
  que d'en laisser passer un malin.
- **Le plafond de dépense ne coupe QUE l'essai gratuit.** Un abonné n'est jamais
  bloqué : sa consommation est déjà bornée par son quota et elle est financée.
  Un plafond global couperait le service aux clients dès que le produit marche.
- **Toute RPC déclarée dans `lib/supabase/types.ts` doit exister dans une
  migration**, et si elle est retirée à `public`, être rendue à `authenticated`.
  Renommer une fonction SQL sans toucher au TypeScript **compile sans broncher**
  et n'échoue qu'à l'exécution — `tests/integration/rpc-parity.test.ts` garde
  contre ce cas, déjà rencontré.
- **Ne jamais annoncer une date de renouvellement sans vérifier `renews`.**
  `consume_kholle` et `kholle_balance` renvoient ce drapeau ; il est faux pour
  l'essai, qui n'a pas de « prochaine fois ». Même règle pour un quota
  journalier à zéro : c'est « réservé au Pro », jamais « reviens demain ».
- **Borner ce qui est renvoyé au modèle à chaque tour.** L'historique de chat et
  le transcrit des relances sont tronqués côté serveur : non bornés, ils
  coûtaient plus que la génération elle-même, et sans cache possible puisqu'ils
  changent à chaque appel.
- **Aucun bouton visible mais inerte.** Si une capacité navigateur manque
  (micro, synthèse vocale), détecter et proposer un repli explicite.
- **Ne jamais prendre la première voix renvoyée par `getVoices()`.** L'ordre est
  arbitraire et donne la voix SAPI historique de Windows. Passer par
  `lib/voice/voice-catalog.ts`.
- **`getVoices()` est asynchrone et peut se remplir tardivement.** Toujours
  écouter `voiceschanged` et prévoir des relances : une lecture unique fait
  afficher « aucune voix disponible » à tort (bug déjà rencontré).
- **Ne pas recommander une voix médiocre faute de mieux.** Si toutes les voix
  installées sont anciennes, l'annoncer et expliquer comment en obtenir une
  bonne.

## Avant de considérer une tâche terminée

```bash
npm run typecheck && npm run lint && npm run test && npm run build
npx playwright test          # desktop + mobile
```
