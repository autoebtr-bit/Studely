import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { readProfile } from "@/lib/data/profile";
import { readSubscription } from "@/lib/data/billing";
import { formatDateLong } from "@/lib/utils/date";
import { SubscriptionCard } from "./subscription-card";

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

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-slate-900">Profil</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Nom complet" value={profile?.fullName ?? "—"} />
          <Field label="Adresse e-mail" value={profile?.email ?? "—"} />
          {/* Renseignés au questionnaire d'accueil : vides tant qu'il n'a pas
              été rempli, plutôt qu'inventés. */}
          <Field label="Niveau d'études" value={profile?.studyLevel ?? "Non renseigné"} />
          <Field
            label="Date d'examen"
            value={profile?.examDate ? formatDateLong(profile.examDate) : "Non renseignée"}
          />
        </div>
        <Button className="mt-5" size="sm" variant="outline">
          Modifier mon profil
        </Button>
      </Card>

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

      <Card className="mt-4 p-6">
        <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
        <div className="mt-4 space-y-3">
          <Toggle
            label="Rappel de révision quotidien"
            hint="Une notification à l'heure de ta séance planifiée."
            defaultChecked
          />
          <Toggle
            label="Alerte de série"
            hint="Prévenu avant de perdre ta série en cours."
            defaultChecked
          />
          <Toggle
            label="Résumé hebdomadaire"
            hint="Ton bilan de progression, chaque dimanche."
          />
        </div>
      </Card>

      <Card className="mt-4 border-red-200 p-6">
        <h2 className="text-sm font-semibold text-red-700">Zone sensible</h2>
        <p className="mt-2 text-sm text-slate-600">
          La suppression du compte efface définitivement tes cours, tes cartes et
          ta progression. Cette action est irréversible.
        </p>
        <Button className="mt-4" size="sm" variant="danger">
          Supprimer mon compte
        </Button>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm text-slate-900">{value}</p>
    </div>
  );
}

function Toggle({
  label,
  hint,
  defaultChecked = false,
}: {
  label: string;
  hint: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 shrink-0 accent-brand-600"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-900">{label}</span>
        <span className="block text-xs text-slate-500">{hint}</span>
      </span>
    </label>
  );
}
