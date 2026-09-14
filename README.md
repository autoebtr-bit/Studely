# Studely

SaaS de coaching scolaire par IA. L'étudiant importe ses cours, révise via huit
modules spécialisés, et progresse dans un système de niveaux qui rend la
régularité visible.

Next.js 14 (App Router) · TypeScript strict · Tailwind · Supabase · Anthropic
`claude-opus-5` · déploiement Vercel.

---

## Démarrer

```bash
npm install
cp .env.example .env.local     # puis renseigner les valeurs
npm run dev                    # http://localhost:3000
```

**L'application tourne sans configuration.** Tant que les variables Supabase
sont absentes, elle fonctionne en mode démonstration sur les données de
`lib/mock/`, et le middleware laisse passer toutes les routes. Dès que
`NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` sont renseignées,
l'authentification et la protection des routes s'activent d'elles-mêmes.

### Première mise en route de la base

Sans ligne de commande ni jeton d'accès — tout se fait depuis le tableau de
bord Supabase.

1. **Créer le projet** sur supabase.com, en **région européenne** : les
   utilisateurs sont des étudiants français, souvent mineurs, et ils déposent
   leurs cours. Le choix de région est définitif.
2. **Appliquer le schéma** : SQL Editor → New query → coller tout
   `supabase/bootstrap.sql` → Run. **Une seule fois** (voir l'en-tête du
   fichier).
3. **Récupérer les clés** : Settings → **API Keys**. Il faut l'URL du projet et
   la clé **publishable** (`sb_publishable_…`), surtout pas la clé secrète.
   Supabase a renommé ses clés : voir `.env.example`.
4. **Renseigner `.env.local`**, puis redémarrer le serveur. L'application quitte
   le mode démonstration d'elle-même.
5. **Activer la confirmation d'adresse** : Authentication → Sign In / Providers.
   C'est le verrou contre les comptes jetables, chacun valant un essai gratuit.

Trois contrôles ensuite, dans l'éditeur SQL :

```sql
-- (a) Aucune table sans RLS. Doit renvoyer zéro ligne : la clé publishable
--     est publique, c'est la RLS qui protège les données.
select c.relname from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

-- (b) Le barème d'XP est chargé. Doit renvoyer 12. À zéro, le seed n'est pas
--     passé et `award_xp` ne créditera jamais rien, sans erreur visible.
select count(*) from xp_rules;
```

Puis (c) créer un compte sur `/signup` et vérifier dans Table Editor que
`profiles`, `subscriptions` et `kholle_credits` ont chacun une ligne — la
dernière avec `remaining = 3`.

### Scripts

| Commande            | Effet                                            |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Serveur de développement                         |
| `npm run build`     | Build de production                              |
| `npm run typecheck` | `tsc --noEmit`, zéro erreur attendue             |
| `npm run lint`      | ESLint (config Next)                             |
| `npm run test`      | Vitest — SM-2, XP, parité TS ↔ SQL              |
| `npm run test:e2e`  | Playwright — parcours réels, desktop et mobile   |

---

## Base de données

```bash
supabase start                 # Postgres + Auth + Storage en local
supabase db reset              # rejoue migrations + seed
supabase gen types typescript --local > lib/supabase/types.ts
```

`lib/supabase/types.ts` est écrit à la main pour l'instant afin que le projet
compile avant la première génération. **Il doit être régénéré** dès que
Supabase tourne en local, et ne plus être édité ensuite.

> Note : les types générés doivent utiliser des alias `type`, jamais des
> `interface`. TypeScript ne donne pas d'index signature implicite aux
> interfaces, qui ne satisfont donc pas la contrainte `GenericSchema` de
> `postgrest-js` — toutes les requêtes se résolvent alors en `never`.

### Sécurité du schéma

- **RLS activée sur 100 % des tables**, policy de base `user_id = auth.uid()`.
- `xp_events` n'a **aucune policy d'écriture**. La seule voie d'attribution est
  la fonction `award_xp`, en `SECURITY DEFINER`, qui calcule le montant côté
  serveur depuis `xp_rules`, applique le plafond journalier et rejette les
  doublons via une clé d'idempotence unique. Le client ne choisit jamais un
  montant d'XP.
- Storage : tout fichier vit sous `{user_id}/`, et les policies comparent le
  premier segment du chemin à `auth.uid()`.

---

## Architecture

```
app/
  (marketing)/      landing publique
  (auth)/           connexion, inscription
  (app)/            application connectée (shell sidebar + topbar)
  api/ai/           routes IA (chat en flux, générations, corrections)
  auth/callback/    retour OAuth et liens magiques
components/
  ui/               primitives du design system
  layout/           sidebar, topbar, chrono flottant
  modules/          carte de module, grille, état « bientôt »
  gamification/     niveau, barre d'XP, série, badges
lib/
  modules/registry.ts   source unique des ~20 modules
  xp/                   barème et courbe de niveaux
  srs/sm2.ts            répétition espacée (fonction pure)
  ai/                   client, prompts, schémas, garde-fou
  voice/                TTS et STT navigateur, derrière une interface
  supabase/             clients navigateur, serveur, middleware
supabase/migrations/    schéma + RLS + award_xp
tests/                  unit · integration · e2e
```

## Design system

Une seule identité pour la landing **et** l'application : fond crème
(`#FAF8F5`), dégradé sunset orange → rose → violet, Plus Jakarta Sans.

| Emplacement | Rôle |
| --- | --- |
| `tailwind.config.ts` | Tokens : `cream`, `brand` (orange), `blush` (rose), `accent` (violet), `ink` (surfaces sombres), ombres, animations |
| `app/styles/gradients.css` | Les dégradés de marque, déclinés par support (aplat, texte, orbe, bordure) |
| `app/styles/decorations.css` | Verre dépoli, halos, micro-interactions (CTA, soulignement de nav, survol de carte) |
| `lib/modules/gradients.ts` | Palette nommée des pavés de module — un module choisit une position sur le dégradé, jamais une couleur libre |

Aucun style n'est écrit en dur dans le JSX : les fichiers CSS sont importés par
`app/globals.css` et inlinés par `postcss-import` avant Tailwind.

**Re-thémer le produit** revient à changer les valeurs de `tailwind.config.ts`
et des deux fichiers CSS. Les composants utilisent des noms sémantiques
(`bg-brand-600`, `text-slate-600`), pas des couleurs littérales.

### Composants de marque et de landing

`components/brand/` (logo, étiquette de section, en-tête de section) et
`components/marketing/` (header, hero, sections, footer) sont des composants
autonomes. Tout le texte de la landing vit dans `lib/marketing/content.ts` :
les sections bouclent sur ces données au lieu de répéter du balisage.

`components/ui/gradient-button.tsx` porte l'appel à l'action principal —
dégradé qui défile au survol, enfoncement au clic, et onde émise au point
exact du curseur.

### Points structurants

**`lib/modules/registry.ts`** décrit les modules une seule fois. Le dashboard,
la sidebar, la recherche et les pages d'attente le lisent tous. Ajouter un
module = une entrée, pas trois fichiers à synchroniser.

**Route de repli `app/(app)/[module]/page.tsx`** rend l'état « bientôt
disponible » pour les douze modules non livrés. Dans l'App Router une route
statique l'emporte sur une route dynamique : les modules actifs ont leur propre
dossier et ne passent jamais par là.

**`lib/ai/guard.ts`** est traversé par chaque route IA, dans cet ordre :
authentification → validation Zod du corps → plafond de dépense global →
consommation du quota → appel du modèle. Le quota est débité **avant** l'appel,
sinon un utilisateur pourrait déclencher un appel facturé puis se voir refuser.

**Le budget se compte en khôlles.** Une khôlle blanche vaut une unité, réservée
au lancement du sujet ; la notation et les relances sont incluses, parce que
couper un élève avant sa fiche lui ferait perdre son oral pour rien. Les volumes
vivent dans `lib/billing/plans.ts` et dans la migration `0008`, tenus synchrones
par `tests/integration/plan-parity.test.ts`. **L'offre gratuite est un essai**,
pas un plan : quatre khôlles offertes une fois pour toutes, puis plus aucun
appel au modèle. Pro (12,90 €) : vingt khôlles par mois. Ce qui n'appelle pas le
modèle — révision des fiches déjà produites, planning, relecture des bilans —
reste gratuit sans limite.

**Ce qui est renvoyé au modèle à chaque tour est borné.** L'historique de chat
et le transcrit des relances sont tronqués côté serveur : non bornés, ils
coûtaient plus que la génération elle-même, et sans cache possible puisqu'ils
changent à chaque appel.

**Prompts constants.** `lib/ai/prompts.ts` ne contient aucune date ni aucun
identifiant. Le cache d'Anthropic fonctionne par correspondance de préfixe : un
octet variable invaliderait le cache à chaque requête. Le contenu de l'élève
passe après le point de cache, dans les messages.

**Un seul modèle.** `claude-opus-5` partout ; le coût se règle par
`output_config.effort` selon l'enjeu (`low` pour l'extraction, `high` pour la
correction de copie et la notation d'oral). Un modèle unique garde aussi un
seul espace de cache.

---

## Duplication assumée : le barème d'XP

Le barème et la courbe de niveaux existent en TypeScript (`lib/xp/`) **et** en
SQL (`supabase/seed.sql`), parce qu'une fonction Postgres ne peut pas importer
du TypeScript. `tests/integration/xp-parity.test.ts` lit le fichier SQL et le
compare aux constantes : modifier l'un sans l'autre fait échouer la suite.

---

## Périmètre

Le produit est recentré sur la khôlle : tout ce qui reste sert à la préparer.
Les modules de jeu ont été retirés — ils diluaient le positionnement sans servir
l'épreuve.

**Livrés** — Khôlle blanche (le module central), puis Mon programme, Questions
de cours, Exos au tableau, Kollia, Planning, Podcast, plus Importer,
Progression, Paramètres et Recherche.

**Différés**, présents dans la grille avec un état « bientôt » : Annales
d'oraux.

Deux personnages, deux rôles : **Kollia** répond par écrit dans la section de
chat (`lib/assistant.ts`) ; à l'oral, l'élève choisit son **khôlleur** entre une
voix féminine et une voix masculine (`lib/voice/examiners.ts`). Le timbre reste
réglable à part, dans les paramètres de voix.

**Hors périmètre V1** : i18n, application mobile, espace enseignant, piste
« diplômés / insertion pro », TTS de qualité studio.

---

## Voix

La couche `lib/voice/` s'appuie sur la Web Speech API du navigateur : aucun
coût, aucune clé. L'interface `SpeechProvider` existe pour qu'un TTS serveur
puisse la remplacer sans toucher aux composants.

### Choix de la voix

`lib/voice/voice-catalog.ts` classe les voix installées sur la machine. Sans
ce classement, le navigateur renvoie la première voix française venue — sous
Windows, la vieille voix SAPI « Hortense », d'où le rendu robotique.

Le classement privilégie, dans l'ordre : « Google français » (Chrome), les voix
neuronales « Online (Natural) » d'Edge, puis les voix féminines premium de
macOS. Les voix masculines et les voix SAPI historiques sont pénalisées.

`voiceQuality()` distingue `naturelle`, `standard` et `ancienne`. Une voix
`ancienne` n'est **jamais** présentée comme recommandée, même quand c'est la
seule disponible : l'interface annonce alors franchement la limite et explique
comment obtenir une voix naturelle. Mieux vaut le dire que survendre.

L'utilisateur garde la main via `components/voice/voice-picker.tsx`, avec
aperçu sonore et mémorisation du choix — le catalogue varie d'une machine à
l'autre, et « agréable à écouter » reste subjectif.

**Plafond assumé** : la qualité est bornée par ce que la machine possède.
Une voix de qualité studio garantie exige un TTS serveur — c'est exactement ce
que `SpeechProvider` permettra de brancher.

Firefox n'implémente pas `SpeechRecognition`. La Colle orale détecte la
capacité au montage et bascule sur une saisie clavier en l'expliquant — jamais
de bouton micro visible mais inerte.

---

## Reste à faire

1. Créer le projet Supabase, appliquer les migrations, régénérer les types.
2. Remplacer les données de `lib/mock/` par les requêtes réelles, page par page.
3. Brancher les composants sur les routes IA (elles sont écrites et typées).
4. Stripe : Checkout, portail client, webhook avec vérification de signature.
5. Tests RLS avec deux comptes : l'utilisateur B ne doit lire aucune ligne de A.
6. Déployer sur Vercel, puis rejouer la recette de bout en bout en production.
