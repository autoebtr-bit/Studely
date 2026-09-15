-- ============================================================================
-- 0012 — Suppression de son propre compte
--
-- La politique de confidentialité promet à l'élève de pouvoir effacer son
-- compte et ses données. Le bouton existait, il ne faisait rien : une promesse
-- écrite noir sur blanc dans un document opposable, et pas tenue.
--
-- Pourquoi une fonction SQL plutôt qu'un appel depuis l'application : effacer
-- une ligne de `auth.users` dépasse les droits de la clé publique. L'autre voie
-- serait la clé de service, mais elle contourne TOUTE la sécurité et n'a rien à
-- faire sur un chemin déclenché par l'utilisateur. Une fonction `security
-- definer` fait exactement une chose, pour exactement son appelant.
-- ============================================================================

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Aucune session' using errcode = '28000';
  end if;

  -- Effacer l'utilisateur d'authentification suffit : `profiles` le référence
  -- avec `on delete cascade`, et toutes les autres tables descendent de
  -- `profiles` de la même façon. Cours, fiches, khôlles, XP, abonnement
  -- partent donc ensemble.
  --
  -- `trial_grants` est la seule exception, et elle est voulue : cette table n'a
  -- **aucune clé étrangère** vers `profiles`, précisément pour que supprimer
  -- son compte ne rende pas droit à un nouvel essai gratuit. Les trois khôlles
  -- offertes valent une fois par personne, pas une fois par compte.
  delete from auth.users where id = v_user;
end;
$$;

comment on function public.delete_own_account() is
  'Efface le compte de l''appelant et toutes ses données. Ne touche pas à '
  'trial_grants, pour que l''essai gratuit ne se rouvre pas.';

-- Retirée à `public` : une fonction qui efface un compte ne doit jamais être
-- appelable sans session. `authenticated` la reçoit explicitement.
revoke execute on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
