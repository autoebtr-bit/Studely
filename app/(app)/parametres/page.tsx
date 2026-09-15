import type { Metadata } from "next";
import { Suspense } from "react";
import { BellOff } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { readProfile } from "@/lib/data/profile";
import { readSubscription } from "@/lib/data/billing";
import { ProfileCard } from "./profile-card";
import { SubscriptionCard } from "./subscription-card";
import { DangerCard } from "./danger-card";

export const metadata: Metadata = { title: "Paramètres" };

// L'abonnement change au retour de Stripe : la page ne doit pas être servie
// depuis un cache.
export const dynamic = "force-dynamic";

export default async function ParametresPage() {
  const [profile, subscription] = await Promise.all([
    readProfile(),
    readSubscription(),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Paramètres" description="Ton compte et tes préférences." />

      <ProfileCard
        fullName={profile?.fullName ?? ""}
        email={profile?.email ?? ""}
        studyLevel={profile?.studyLevel ?? null}
        examDate={profile?.examDate ?? null}
      />

      {/* `useSearchParams` impose une frontière Suspense, sinon le prérendu de
          production échoue. */}
      <Suspense
        fallback={
          <Card className="mt-4 p-6">
            <h2 className="text-sm font-semibold text-slate-900">Abonnement</h2>
          </Card>
        }
      >
        <SubscriptionCard {...subscription} />
      </Suspense>

      {/*
        Trois interrupteurs de notification vivaient ici — rappel quotidien,
        alerte de série, résumé hebdomadaire. Aucun n'était relié à quoi que ce
        soit : pas de colonne en base, pas d'envoi d'e-mail, rien. Les cocher ne
        faisait rien et ne promettait que du vide.

        Les retirer plutôt que de les laisser : un réglage qui ne règle rien use
        la confiance bien plus qu'une fonction annoncée comme à venir.
      */}
      <Card className="mt-4 p-6">
        <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
        <p className="mt-2 flex items-start gap-2.5 text-sm text-slate-600">
          <BellOff className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
          Aucune notification n&apos;est envoyée pour l&apos;instant. Les rappels
          de révision et le bilan hebdomadaire arriveront dans une prochaine
          version — tu pourras alors choisir ce que tu reçois.
        </p>
      </Card>

      <DangerCard />
    </div>
  );
}
