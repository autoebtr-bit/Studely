import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { REVEAL_SCRIPT } from "@/lib/marketing/reveal-script";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cream-50">
      {/*
        En tête de page, avant tout contenu : le script doit s'exécuter avant le
        premier rendu, sinon les blocs s'afficheraient puis disparaîtraient.
        Contenu statique, sans aucune donnée extérieure.
      */}
      <script dangerouslySetInnerHTML={{ __html: REVEAL_SCRIPT }} />

      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
