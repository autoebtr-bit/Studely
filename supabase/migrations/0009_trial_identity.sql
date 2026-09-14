-- ============================================================================
-- 0009 — Un essai par personne, pas par adresse
--
-- Sans ça, `victor+1@gmail.com`, `victor+2@gmail.com` et `v.i.c.t.o.r@gmail.com`
-- arrivent dans la même boîte et ouvrent trois essais gratuits.
--
-- Ce fichier ne prétend pas rendre la fraude impossible — elle ne l'est jamais.
-- Il ferme les contournements gratuits et automatiques, et laisse le plafond de
-- dépense (`free_tier_spend_this_month`) borner ce qui passerait quand même.
--
-- Principe de prudence : un essai vaut ~0,87 €. Refuser un vrai élève coûte
-- beaucoup plus cher que d'en laisser passer un malin — donc au moindre doute,
-- on n'assimile pas deux adresses.
-- ============================================================================

/* ------------------------------------------------- Identité canonique ----- */

/**
 * Réduit une adresse à l'identité qu'elle désigne.
 *
 * Les deux normalisations sont limitées aux fournisseurs où elles sont
 * documentées. Ailleurs, `a+b@x.fr` et `a.b@x.fr` peuvent appartenir à deux
 * personnes distinctes, et les fusionner refuserait l'essai à quelqu'un de
 * légitime.
 *
 * Doit rester identique à `canonicalEmail` (`lib/auth/email.ts`) ;
 * `tests/integration/email-parity.test.ts` le vérifie.
 */
create or replace function public.canonical_email(p_email text)
returns text
language plpgsql
immutable
as $$
declare
  v_clean  text := lower(trim(p_email));
  v_at     integer;
  v_local  text;
  v_domain text;
  v_plus   integer;
begin
  v_at := length(v_clean) - position('@' in reverse(v_clean)) + 1;
  if v_at <= 1 or v_at >= length(v_clean) then
    return null;
  end if;

  v_local  := substring(v_clean from 1 for v_at - 1);
  v_domain := substring(v_clean from v_at + 1);

  if v_local = '' or position('.' in v_domain) = 0 then
    return null;
  end if;

  -- googlemail.com sert la même boîte que gmail.com.
  if v_domain = 'googlemail.com' then
    v_domain := 'gmail.com';
  end if;

  -- L'étiquette après « + » ne change pas la destination.
  if v_domain in (
    'gmail.com','outlook.com','outlook.fr','hotmail.com','hotmail.fr',
    'live.com','live.fr','msn.com','yahoo.com','yahoo.fr','proton.me',
    'protonmail.com','pm.me','icloud.com','me.com','fastmail.com'
  ) then
    v_plus := position('+' in v_local);
    if v_plus > 0 then
      v_local := substring(v_local from 1 for v_plus - 1);
    end if;
  end if;

  -- Chez Google, les points du nom d'utilisateur sont ignorés.
  if v_domain = 'gmail.com' then
    v_local := replace(v_local, '.', '');
  end if;

  if v_local = '' then
    return null;
  end if;

  return v_local || '@' || v_domain;
end;
$$;

/* ----------------------------------------------- Domaines jetables -------- */

/**
 * Modifiable sans redéploiement : une liste exhaustive n'existe pas, de
 * nouveaux domaines apparaissent en permanence. Quand un abus est repéré, on
 * ajoute une ligne ici.
 */
create table public.disposable_email_domains (
  domain     text primary key,
  added_at   timestamptz not null default now()
);

insert into public.disposable_email_domains (domain) values
  ('10minutemail.com'), ('guerrillamail.com'), ('guerrillamail.info'),
  ('mailinator.com'),   ('yopmail.com'),       ('yopmail.fr'),
  ('temp-mail.org'),    ('tempmail.com'),      ('throwawaymail.com'),
  ('sharklasers.com'),  ('getnada.com'),       ('trashmail.com'),
  ('jetable.org'),      ('maildrop.cc'),       ('dispostable.com'),
  ('fakeinbox.com'),    ('mohmal.com'),        ('emailondeck.com'),
  ('spamgourmet.com'),  ('mytemp.email')
on conflict (domain) do nothing;

alter table public.disposable_email_domains enable row level security;
-- Aucune policy : seules les fonctions `security definer` la lisent. Exposer la
-- liste apprendrait à l'abuseur quels domaines éviter.

/* ------------------------------------------- Un crédit par identité ------- */

/**
 * Mémoire des essais déjà accordés, indépendante des comptes.
 *
 * Volontairement sans clé étrangère vers `profiles` : elle doit survivre à la
 * suppression du compte, sinon supprimer puis se réinscrire redonnerait
 * l'essai. C'est le contournement le plus évident une fois les alias fermés.
 */
create table public.trial_grants (
  email_canonical text primary key,
  granted_at      timestamptz not null default now(),
  /** Dernier compte servi, pour le suivi. Volontairement sans contrainte. */
  last_user_id    uuid
);

alter table public.trial_grants enable row level security;
-- Aucune policy : contenu strictement interne au serveur.

/* ------------------------------------ Attribution des khôlles offertes ---- */

/**
 * Remplace la version de 0008.
 *
 * L'essai n'est accordé que si les trois conditions tiennent :
 *  - l'adresse est exploitable,
 *  - son domaine n'est pas un service jetable connu,
 *  - cette identité n'a jamais reçu d'essai.
 *
 * Sinon le compte est créé normalement, avec zéro khôlle offerte. On ne refuse
 * pas l'inscription : l'élève peut consulter le produit et s'abonner, et un
 * faux positif ne lui ferme pas la porte.
 */
create or replace function public.handle_new_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email     text;
  v_canonical text;
  v_domain    text;
  v_credits   integer := 0;
begin
  insert into public.subscriptions (user_id) values (new.id)
  on conflict (user_id) do nothing;

  select u.email into v_email from auth.users u where u.id = new.id;
  v_canonical := public.canonical_email(v_email);

  if v_canonical is not null then
    v_domain := split_part(v_canonical, '@', 2);

    if not exists (
      select 1 from public.disposable_email_domains d where d.domain = v_domain
    ) then
      -- `on conflict do nothing` puis test du nombre de lignes : deux
      -- inscriptions simultanées sur la même identité ne peuvent pas obtenir
      -- l'essai chacune de leur côté.
      insert into public.trial_grants (email_canonical, last_user_id)
      values (v_canonical, new.id)
      on conflict (email_canonical) do nothing;

      if found then
        v_credits := 3;
      end if;
    end if;
  end if;

  insert into public.kholle_credits (user_id, remaining)
  values (new.id, v_credits)
  on conflict (user_id) do nothing;

  return new;
end;
$$;
