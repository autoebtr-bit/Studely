import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MODULES, getModule } from "@/lib/modules/registry";
import { ComingSoon } from "@/components/modules/coming-soon";

/**
 * Route de repli pour les modules annoncés mais pas encore livrés.
 *
 * Les modules actifs ont leur propre dossier ; dans l'App Router une route
 * statique l'emporte toujours sur une route dynamique, donc ce fichier ne
 * capture que les slugs « soon ». Tout autre segment renvoie un 404.
 */

interface PageProps {
  params: { module: string };
}

export function generateStaticParams() {
  return MODULES.filter((m) => m.status === "soon").map((m) => ({
    module: m.slug,
  }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  // `module` est un identifiant réservé côté Next/ESLint : on nomme la variable `mod`.
  const mod = getModule(params.module);
  return { title: mod ? `${mod.title} — bientôt` : "Introuvable" };
}

export default function SoonModulePage({ params }: PageProps) {
  const mod = getModule(params.module);

  if (!mod || mod.status !== "soon") notFound();

  return <ComingSoon module={mod} />;
}
