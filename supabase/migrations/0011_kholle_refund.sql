-- ============================================================================
-- 0011 — Rendre la khôlle quand la génération échoue
--
-- Le quota est débité AVANT l'appel au modèle, et c'est voulu : autrement un
-- utilisateur pourrait déclencher un appel facturé puis se voir refuser.
--
-- Mais ce choix a un angle mort. Si le modèle échoue — clé absente, panne,
-- réponse illisible — l'élève perd une khôlle sans rien recevoir. Sur un essai
-- de trois khôlles, c'est un tiers du produit envolé sur une panne qui n'est
-- pas la sienne.
--
-- D'où cette fonction, appelée par la route quand la préparation du sujet
-- échoue.
-- ============================================================================

/**
 * Recrédite une khôlle à l'appelant.
 *
 * `p_source` vient de `consume_kholle` : il faut rendre au bon endroit, une
 * khôlle offerte n'étant pas la même chose qu'une khôlle du plan.
 *
 * Volontairement silencieuse si rien n'a été consommé : on ne veut pas qu'un
 * remboursement en double crée du crédit à partir de rien.
 */
create or replace function public.refund_kholle(p_source text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user       uuid := auth.uid();
  v_plan       public.plan_tier;
  v_period     text;
  v_period_end timestamptz;
  v_start      date;
begin
  if v_user is null then
    raise exception 'refund_kholle: appel non authentifié' using errcode = '42501';
  end if;

  if p_source = 'offerte' then
    update public.kholle_credits
       set remaining = remaining + 1
     where user_id = v_user;
    return;
  end if;

  select coalesce(s.plan, 'gratuit'), s.current_period_end
    into v_plan, v_period_end
  from public.profiles p
  left join public.subscriptions s on s.user_id = p.id
  where p.id = v_user;

  select kholle_period into v_period
  from public.plan_limits where plan = v_plan;

  v_start := public.kholle_period_start(coalesce(v_period, 'week'), v_period_end);

  -- `greatest(..., 0)` : un remboursement ne doit jamais rendre le compteur
  -- négatif, ce qui offrirait des khôlles en trop.
  update public.kholle_usage
     set used = greatest(used - 1, 0)
   where user_id = v_user and period_start = v_start;
end;
$$;

revoke all on function public.refund_kholle(text) from public;
grant execute on function public.refund_kholle(text) to authenticated;
