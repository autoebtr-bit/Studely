import type { ReactNode } from "react";
import { A_COMPLETER } from "@/lib/legal/entity";

/**
 * Gabarit commun aux pages légales.
 *
 * Elles partagent la même mise en page et n'ont pas à réinventer de style :
 * aucune couleur propre, uniquement les tokens de marque, comme tout le reste
 * du site.
 */
export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  /** Date de dernière mise à jour, au format lisible. */
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-14 sm:py-20">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
        {title}
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Dernière mise à jour : {updatedAt}
      </p>

      <div className="mt-10 space-y-8">{children}</div>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-2.5 space-y-2.5 text-sm leading-relaxed text-slate-700">
        {children}
      </div>
    </section>
  );
}

/**
 * Ligne « intitulé : valeur » des mentions légales.
 *
 * Une valeur non renseignée n'est pas masquée : la page doit montrer ce qui
 * manque plutôt que de laisser croire que la mention est absente parce qu'elle
 * ne s'applique pas.
 *
 * Elle n'affiche pas non plus le marqueur technique brut, qui ressemblerait à
 * un bug plutôt qu'à une information manquante. `npm run check:launch` reste le
 * garde-fou qui empêche d'ouvrir au public dans cet état.
 */
export function LegalField({ label, value }: { label: string; value: string }) {
  const missing = value === A_COMPLETER;

  return (
    <p>
      <span className="font-medium text-slate-900">{label} : </span>
      <span className={missing ? "italic text-slate-400" : undefined}>
        {missing ? "à renseigner" : value}
      </span>
    </p>
  );
}
