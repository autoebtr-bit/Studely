"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Check, ExternalLink, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ASSISTANT } from "@/lib/assistant";
import { KHOLLES_OFFERTES, PLAN_LIMITS, PRO_PRICE_EUR } from "@/lib/billing/plans";
import { postAi } from "@/lib/api/ai";
import { formatDateLong } from "@/lib/utils/date";

interface SubscriptionCardProps {
  plan: "gratuit" | "pro";
  status: "actif" | "essai" | "en_retard" | "annule";
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasStripeCustomer: boolean;
  kholleCredits: number;
  billingOpen: boolean;
}

/**
 * Libellés d'état.
 *
 * `en_retard` ne dit pas « suspendu » : l'accès est maintenu pendant que Stripe
 * relance le paiement, et annoncer une coupure qui n'a pas lieu ferait partir
 * un client qui voulait payer.
 */
const STATUS_LABEL: Record<SubscriptionCardProps["status"], string> = {
  actif: "Pro",
  essai: "Essai",
  en_retard: "Paiement à régulariser",
  annule: "Essai terminé",
};

export function SubscriptionCard({
  plan,
  status,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  hasStripeCustomer,
  kholleCredits,
  billingOpen,
}: SubscriptionCardProps) {
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPro = plan === "pro";
  // Le retour de Stripe ne fait pas foi sur le paiement — c'est le webhook qui
  // l'enregistre — mais il permet d'accuser réception plutôt que de renvoyer
  // l'élève sur une page inchangée.
  const justPaid = params.get("abonnement") === "ok";

  async function go(path: string) {
    setBusy(true);
    setError(null);

    const result = await postAi<{ url: string }>(path, {});

    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }

    // Pas de `setBusy(false)` : la page est en train d'être quittée, et rendre
    // le bouton de nouveau cliquable inviterait à un double paiement.
    window.location.href = result.data.url;
  }

  return (
    <Card className="mt-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Abonnement</h2>
        <Badge variant={isPro ? "success" : "brand"}>{STATUS_LABEL[status]}</Badge>
      </div>

      {justPaid && (
        <p className="mt-3 flex items-start gap-2 rounded-card bg-emerald-50 p-3 text-sm text-emerald-800">
          <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
          Paiement reçu, merci. L&apos;activation peut prendre quelques secondes
          — recharge la page si le statut n&apos;a pas encore changé.
        </p>
      )}

      {/* Les volumes viennent de `lib/billing/plans.ts`, jamais recopiés. */}
      {isPro ? (
        <>
          <p className="mt-2 text-sm text-slate-600">
            Tu as {PLAN_LIMITS.pro.kholles} khôlles blanches par mois, les
            relances en direct et l&apos;accès à {ASSISTANT.name}.
          </p>
          {currentPeriodEnd && (
            <p className="mt-1.5 text-sm text-slate-500">
              {cancelAtPeriodEnd
                ? `Résilié : ton accès reste ouvert jusqu'au ${formatDateLong(currentPeriodEnd)}.`
                : `Prochain renouvellement le ${formatDateLong(currentPeriodEnd)}.`}
            </p>
          )}
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-slate-600">
            L&apos;essai gratuit comprend {KHOLLES_OFFERTES} khôlles blanches,
            une fois pour toutes. Ensuite, le Pro donne{" "}
            {PLAN_LIMITS.pro.kholles} khôlles par mois et l&apos;accès à{" "}
            {ASSISTANT.name}, pour {PRO_PRICE_EUR} par mois, sans engagement.
          </p>
          <p className="mt-1.5 text-sm text-slate-500">
            {kholleCredits > 0
              ? `Il te reste ${kholleCredits} khôlle${kholleCredits > 1 ? "s" : ""} offerte${kholleCredits > 1 ? "s" : ""}.`
              : "Tes khôlles offertes ont été utilisées."}{" "}
            Tes fiches déjà produites restent consultables dans tous les cas.
          </p>
        </>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {billingOpen ? (
          <>
            {!isPro && (
              <Button size="sm" onClick={() => void go("/api/billing/checkout")} disabled={busy}>
                {busy && <Loader2 className="animate-spin" />}
                Passer au Pro · {PRO_PRICE_EUR}/mois
              </Button>
            )}
            {hasStripeCustomer && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void go("/api/billing/portal")}
                disabled={busy}
              >
                {busy ? <Loader2 className="animate-spin" /> : <ExternalLink />}
                Gérer mon abonnement
              </Button>
            )}
          </>
        ) : (
          // Aucun bouton visible mais inerte : tant que le paiement n'est pas
          // ouvert, on le dit au lieu d'afficher un bouton qui échouerait.
          <p className="text-sm text-slate-500">
            L&apos;abonnement ouvre très bientôt. Ton essai reste disponible
            d&apos;ici là.
          </p>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 text-sm text-red-600"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </Card>
  );
}
