import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  BookOpen,
  CreditCard,
  Mic,
  TriangleAlert,
  UserPlus,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  readAdminOverview,
  readIsAdmin,
  readTopSpenders,
} from "@/lib/data/admin";
import { PLAN_LIMITS, PRO_PRICE_EUR } from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};

// Des chiffres du jour : jamais servis depuis un cache.
export const dynamic = "force-dynamic";

/**
 * Tableau de bord d'exploitation.
 *
 * Aucun lien n'y mène : on y accède en tapant l'adresse. Ce n'est pas la
 * protection — celle-ci vit dans les fonctions SQL, qui refusent de répondre à
 * qui n'est pas administrateur — mais ça évite de la donner à deviner.
 *
 * Un non-administrateur reçoit un 404, pas un 403 : dire « cette page existe
 * mais pas pour toi » renseigne l'attaquant sans servir personne.
 *
 * **Aucun contenu d'élève n'apparaît ici.** Des sommes et des comptes, pas un
 * cours, pas une khôlle, pas une copie. Administrer un service ne donne pas le
 * droit de lire les révisions de ses élèves.
 */
export default async function AdminPage() {
  if (!(await readIsAdmin())) notFound();

  const [apercu, gros] = await Promise.all([
    readAdminOverview(),
    readTopSpenders(10),
  ]);

  if (!apercu) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Administration" description="Chiffres du mois." />
        <Card className="p-8 text-center text-sm text-slate-600">
          Les chiffres n&apos;ont pas pu être lus. Vérifie que la migration
          <span className="font-mono"> 0013_admin.sql </span>
          est bien appliquée.
        </Card>
      </div>
    );
  }

  const recettes = apercu.abonnesActifs * Number(PRO_PRICE_EUR.replace(/[^\d,]/g, "").replace(",", "."));
  const partGratuit =
    apercu.coutMoisUsd > 0
      ? Math.round((apercu.coutGratuitMoisUsd / apercu.coutMoisUsd) * 100)
      : 0;

  // Ce que coûte une khôlle en moyenne, mesuré et non estimé. C'est le chiffre
  // qui dit si le prix de l'abonnement tient : à 20 khôlles par mois pour
  // 12,90 €, une khôlle au-dessus de ~0,50 € rendrait l'offre perdante.
  const coutParKholle =
    apercu.khollesMois > 0 ? apercu.coutMoisUsd / apercu.khollesMois : null;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Administration"
        description="Chiffres du mois en cours. Visible de toi seul."
      />

      {/* ------------------------------------------------------- Argent -- */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-slate-900">Ce mois-ci</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Chiffre
            label="Coût API"
            value={`${apercu.coutMoisUsd.toFixed(2)} $`}
            hint="facturé par Anthropic"
          />
          <Chiffre
            label="Recettes brutes"
            value={`${recettes.toFixed(2)} €`}
            hint={`${apercu.abonnesActifs} abonné${apercu.abonnesActifs > 1 ? "s" : ""} × ${PRO_PRICE_EUR}`}
          />
          <Chiffre
            label="Coût par khôlle"
            value={coutParKholle === null ? "—" : `${coutParKholle.toFixed(2)} $`}
            hint={
              coutParKholle === null
                ? "aucune khôlle ce mois"
                : `sur ${apercu.khollesMois} khôlle${apercu.khollesMois > 1 ? "s" : ""}`
            }
          />
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Les deux premiers chiffres ne sont pas dans la même monnaie —
          l&apos;API se facture en dollars, l&apos;abonnement en euros. Je ne
          convertis pas : un taux figé dans le code se périme et donnerait une
          marge fausse. À l&apos;œil, les deux sont comparables à ~10 % près.
        </p>
      </Card>

      {/* --------------------------------------------- Essai gratuit -- */}
      <Card className="mt-4 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Ce que coûte l&apos;essai gratuit
          </h2>
          <span className="text-sm tabular-nums text-slate-500">
            {apercu.coutGratuitMoisUsd.toFixed(2)} $ · {partGratuit} % du total
          </span>
        </div>

        <Progress
          value={Math.min(100, partGratuit)}
          className="mt-3"
          label="Part de l'essai gratuit dans la dépense"
        />

        <p className="mt-3 text-sm text-slate-600">
          C&apos;est la seule dépense que personne ne finance. Un abonné coûte
          aussi, mais il paie. Si cette part dépasse durablement la moitié du
          total, c&apos;est le taux de conversion qu&apos;il faut regarder, pas
          la facture.
        </p>
      </Card>

      {/* ------------------------------------------------------ Comptes -- */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900">Comptes</h2>
          <div className="mt-3 space-y-2.5">
            <Ligne icon={Users} label="Inscrits" value={apercu.comptes} />
            <Ligne
              icon={UserPlus}
              label="Depuis 7 jours"
              value={apercu.comptesSemaine}
            />
            <Ligne
              icon={AlertTriangle}
              label="Essais épuisés"
              value={apercu.essaisEpuises}
              hint="ont tout consommé sans s'abonner"
            />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900">Abonnements</h2>
          <div className="mt-3 space-y-2.5">
            <Ligne
              icon={CreditCard}
              label="Actifs"
              value={apercu.abonnesActifs}
            />
            <Ligne
              icon={TriangleAlert}
              label="Paiement en retard"
              value={apercu.abonnesEnRetard}
              hint="servis pendant les relances"
            />
            <Ligne
              icon={Mic}
              label="Khôlles ce mois"
              value={apercu.khollesMois}
              hint={`plafond Pro : ${PLAN_LIMITS.pro.kholles}/mois`}
            />
            <Ligne
              icon={BookOpen}
              label="Cours importés"
              value={apercu.coursImportes}
            />
          </div>
        </Card>
      </div>

      {/* ---------------------------------------------- Gros consommateurs */}
      <Card className="mt-4 p-6">
        <h2 className="text-sm font-semibold text-slate-900">
          Plus fortes consommations du mois
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Plusieurs comptes gratuits en tête, créés au même moment, est le motif
          d&apos;une campagne d&apos;abus — à repérer avant qu&apos;elle ne vide
          la caisse.
        </p>

        {gros.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Aucune consommation enregistrée ce mois-ci.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-200 text-left text-xs text-slate-500">
                  <th className="pb-2 font-medium">Compte</th>
                  <th className="pb-2 font-medium">Offre</th>
                  <th className="pb-2 text-right font-medium">Appels</th>
                  <th className="pb-2 text-right font-medium">Coût</th>
                </tr>
              </thead>
              <tbody>
                {gros.map((ligne) => (
                  <tr key={ligne.email} className="border-b border-cream-100">
                    <td className="max-w-[220px] truncate py-2 text-slate-800">
                      {ligne.email}
                    </td>
                    <td className="py-2">
                      <span
                        className={
                          ligne.plan === "pro"
                            ? "text-emerald-700"
                            : "text-slate-500"
                        }
                      >
                        {ligne.plan === "pro" ? "Pro" : "Gratuit"}
                      </span>
                    </td>
                    <td className="py-2 text-right tabular-nums text-slate-600">
                      {ligne.appels}
                    </td>
                    <td className="py-2 text-right tabular-nums text-slate-900">
                      {ligne.coutUsd.toFixed(2)} $
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Chiffre({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums text-slate-900">
        {value}
      </p>
      <p className="text-xs text-slate-400">{hint}</p>
    </div>
  );
}

function Ligne({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-700">{label}</p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
      <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
        {value}
      </p>
    </div>
  );
}
