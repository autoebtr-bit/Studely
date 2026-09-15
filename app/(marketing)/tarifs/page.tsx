import type { Metadata } from "next";
import Link from "next/link";
import { PricingSection } from "@/components/marketing/pricing-section";
import { KHOLLES_OFFERTES } from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Essai gratuit puis abonnement mensuel sans engagement, résiliable en deux clics.",
};

/**
 * Page de tarifs autonome.
 *
 * `/tarifs` était **déclarée publique dans le middleware mais n'existait pas** :
 * un visiteur non connecté y était laissé passer, pour arriver sur un 404. Ce
 * genre d'adresse finit toujours par être partagée — c'est celle qu'on envoie
 * quand on parle du prix.
 *
 * Elle réutilise la section de la vitrine plutôt que d'en recopier le contenu :
 * les volumes et le prix viennent de `lib/billing/plans.ts`, et un tarif qui
 * diverge d'une page à l'autre est le meilleur moyen de se faire accuser de
 * publicité trompeuse.
 */
export default function TarifsPage() {
  return (
    <div className="py-10 sm:py-14">
      <PricingSection />

      <div className="mx-auto mt-4 max-w-2xl px-5 text-center">
        <p className="text-sm text-slate-600">
          L&apos;essai comprend {KHOLLES_OFFERTES} khôlles blanches, sans carte
          bancaire. L&apos;abonnement est mensuel, sans engagement, et se résilie
          en deux clics depuis tes paramètres.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Le détail figure dans les{" "}
          <Link href="/cgv" className="text-brand-600 underline">
            conditions de vente
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
