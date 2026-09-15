-- ============================================================================
-- 0013 — Tableau de bord d'administration
--
-- Un écran qui affiche la dépense de TOUS les comptes doit lire des lignes qui
-- n'appartiennent pas à celui qui regarde — exactement ce que la RLS interdit,
-- et c'est très bien ainsi.
--
-- Trois façons de contourner, deux sont mauvaises :
--
--  1. La clé de service. Elle désactive toute la sécurité : une faille sur
--     cette page exposerait la base entière. Écartée.
--  2. Une liste d'adresses dans une variable d'environnement. Le contrôle
--     vivrait alors hors de la base, donc contournable par tout ce qui parle à
--     Postgres directement. Écartée.
--  3. Un drapeau en base, lu par une fonction `security definer` qui refuse de
--     répondre à qui ne l'a pas. Le contrôle est là où il ne peut pas être
--     contourné. Retenue.
--
-- Les fonctions ne renvoient que des AGRÉGATS : des sommes et des comptes,
-- jamais le contenu d'un cours, d'une khôlle ou d'une copie. Administrer un
-- service ne donne pas le droit de lire les révisions de ses élèves.
-- ============================================================================

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

comment on column public.profiles.is_admin is
  'Accès au tableau de bord d''administration. Ne donne aucun droit de lecture '
  'sur le contenu des élèves — seulement sur des agrégats.';

/* ------------------------------------------------------------- Contrôle -- */

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

/* ------------------------------------------------------------- Aperçu -- */

/**
 * Chiffres du mois en cours.
 *
 * `security definer` pour franchir la RLS, mais la première instruction est un
 * refus si l'appelant n'est pas administrateur : le privilège ne s'applique
 * qu'après le contrôle, jamais avant.
 */
create or replace function public.admin_overview()
returns table (
  comptes              integer,
  comptes_semaine      integer,
  abonnes_actifs       integer,
  abonnes_en_retard    integer,
  essais_epuises       integer,
  kholles_mois         integer,
  cours_importes       integer,
  cout_mois_usd        numeric,
  cout_gratuit_mois_usd numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_debut_mois timestamptz := date_trunc('month', now());
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs' using errcode = '42501';
  end if;

  return query
  select
    (select count(*)::integer from public.profiles),
    (select count(*)::integer from public.profiles
      where created_at >= now() - interval '7 days'),
    (select count(*)::integer from public.subscriptions
      where plan = 'pro' and status in ('actif', 'essai')),
    (select count(*)::integer from public.subscriptions
      where status = 'en_retard'),
    -- Essai épuisé : plus aucune khôlle offerte, et pas d'abonnement.
    (select count(*)::integer
       from public.kholle_credits kc
       join public.subscriptions s on s.user_id = kc.user_id
      where kc.remaining = 0 and s.plan = 'gratuit'),
    (select count(*)::integer from public.kholle_sessions
      where created_at >= v_debut_mois),
    (select count(*)::integer from public.chapters),
    (select coalesce(sum(cost_est_usd), 0)::numeric from public.ai_usage_log
      where created_at >= v_debut_mois),
    -- Part imputable aux comptes gratuits : c'est elle que le plafond borne,
    -- et la seule qui ne soit financée par personne.
    (select coalesce(sum(l.cost_est_usd), 0)::numeric
       from public.ai_usage_log l
       join public.subscriptions s on s.user_id = l.user_id
      where l.created_at >= v_debut_mois and s.plan = 'gratuit');
end;
$$;

revoke execute on function public.admin_overview() from public;
grant execute on function public.admin_overview() to authenticated;

/* ------------------------------------------------- Plus gros consommateurs */

/**
 * Les comptes qui coûtent le plus ce mois-ci.
 *
 * Sert à repérer un abus — une dizaine de comptes gratuits créés le même jour
 * et consommant au maximum — avant qu'il ne vide la caisse.
 *
 * Renvoie l'adresse e-mail parce qu'un identifiant ne permet pas d'agir : il
 * faut pouvoir écrire à la personne, ou reconnaître un motif dans les
 * adresses. Aucun contenu de cours ni de khôlle n'est exposé.
 */
create or replace function public.admin_top_spenders(p_limit integer default 10)
returns table (
  email       text,
  plan        public.plan_tier,
  cout_usd    numeric,
  appels      integer
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs' using errcode = '42501';
  end if;

  return query
  select
    u.email::text,
    coalesce(s.plan, 'gratuit'::public.plan_tier),
    coalesce(sum(l.cost_est_usd), 0)::numeric,
    count(*)::integer
  from public.ai_usage_log l
  join auth.users u on u.id = l.user_id
  left join public.subscriptions s on s.user_id = l.user_id
  where l.created_at >= date_trunc('month', now())
  group by u.email, s.plan
  order by 3 desc
  limit greatest(1, least(coalesce(p_limit, 10), 50));
end;
$$;

revoke execute on function public.admin_top_spenders(integer) from public;
grant execute on function public.admin_top_spenders(integer) to authenticated;
