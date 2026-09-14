import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_ENTITY } from "@/lib/legal/entity";
import {
  KHOLLES_OFFERTES,
  PLAN_LIMITS,
  PRO_PRICE_EUR,
} from "@/lib/billing/plans";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  description:
    "Abonnement Studely : prix, durée, résiliation et droit de rétractation.",
  robots: { index: false, follow: true },
};

export default function CgvPage() {
  const e = LEGAL_ENTITY;

  return (
    <LegalPage
      title="Conditions générales de vente"
      updatedAt="13 septembre 2026"
    >
      <LegalSection title="Objet">
        <p>
          Les présentes conditions régissent la vente de l&apos;abonnement au
          service {e.siteName}, édité par {e.publisher}, dont les coordonnées
          figurent dans les{" "}
          <Link href="/mentions-legales" className="text-brand-600 underline">
            mentions légales
          </Link>
          . Souscrire vaut acceptation.
        </p>
      </LegalSection>

      <LegalSection title="Le service">
        <p>
          {e.siteName} propose un entraînement aux khôlles : un examinateur
          simulé interroge l&apos;élève, l&apos;interrompt, puis produit une
          note et une appréciation. S&apos;y ajoutent la génération de fiches,
          d&apos;exercices, de podcasts de révision et d&apos;un planning à
          partir des cours déposés.
        </p>
        <p>
          Ces contenus sont produits par un modèle de langage. Ils constituent
          une aide à la préparation et{" "}
          <strong>ne garantissent aucun résultat aux épreuves</strong>. Aucune
          obligation de résultat n&apos;est souscrite.
        </p>
      </LegalSection>

      <LegalSection title="Essai gratuit">
        <p>
          Toute inscription ouvre droit à {KHOLLES_OFFERTES} khôlles blanches
          offertes, sans carte bancaire. Cet essai n&apos;est pas reconductible
          et n&apos;est accordé qu&apos;une fois par personne : supprimer puis
          recréer un compte ne le rouvre pas.
        </p>
        <p>
          L&apos;essai épuisé, les fonctions faisant appel à
          l&apos;intelligence artificielle cessent d&apos;être accessibles. Les
          contenus déjà produits — fiches, bilans, cours importés — restent
          consultables.
        </p>
      </LegalSection>

      <LegalSection title="Abonnement et prix">
        <p>
          L&apos;abonnement Pro est proposé à {PRO_PRICE_EUR} par mois, toutes
          taxes comprises. Il comprend {PLAN_LIMITS.pro.kholles} khôlles
          blanches par mois, ainsi que les quotas quotidiens de génération et de
          conversation indiqués dans l&apos;application.
        </p>
        <p>
          Ces volumes sont des limites d&apos;usage, non des engagements de
          consommation : les khôlles non utilisées ne se reportent pas sur la
          période suivante.
        </p>
        <p>
          Le prix peut évoluer. Tout changement est notifié au moins trente
          jours à l&apos;avance et ne s&apos;applique qu&apos;aux périodes
          suivantes ; il ouvre droit à résiliation sans frais.
        </p>
      </LegalSection>

      <LegalSection title="Paiement">
        <p>
          Le paiement s&apos;effectue par carte bancaire, via Stripe. Aucune
          donnée bancaire ne transite par nos serveurs ni n&apos;y est
          conservée.
        </p>
        <p>
          L&apos;abonnement est mensuel, sans engagement, reconduit tacitement
          chaque mois jusqu&apos;à résiliation. En cas d&apos;échec de
          prélèvement, l&apos;accès est maintenu le temps des relances
          automatiques ; il prend fin si la situation n&apos;est pas
          régularisée.
        </p>
      </LegalSection>

      <LegalSection title="Résiliation">
        <p>
          La résiliation se fait à tout moment, en deux clics, depuis les
          paramètres du compte. Elle prend effet à la fin de la période en
          cours : l&apos;accès reste ouvert jusque-là, et aucun nouveau
          prélèvement n&apos;intervient.
        </p>
        <p>
          Les mois entamés ne sont pas remboursés au prorata, sauf exercice du
          droit de rétractation ci-dessous ou indisponibilité prolongée qui nous
          serait imputable.
        </p>
      </LegalSection>

      <LegalSection title="Droit de rétractation">
        <p>
          Un consommateur dispose de quatorze jours pour se rétracter, à compter
          de la souscription, en écrivant à {e.contactEmail}.
        </p>
        <p>
          <strong>Une réserve importante :</strong> en demandant
          l&apos;exécution immédiate du service — c&apos;est-à-dire en
          l&apos;utilisant dès la souscription — vous acceptez que ce droit
          s&apos;éteigne une fois le service pleinement exécuté, et vous restez
          redevable de ce qui a été consommé. Concrètement, une khôlle blanche
          déjà passée est due.
        </p>
      </LegalSection>

      <LegalSection title="Usage raisonnable">
        <p>
          Le compte est strictement personnel. Le partage d&apos;identifiants,
          la revente d&apos;accès, l&apos;automatisation des requêtes et la
          création répétée de comptes destinée à contourner l&apos;essai gratuit
          peuvent entraîner la suspension du compte, sans remboursement des
          sommes correspondant à un usage abusif.
        </p>
      </LegalSection>

      <LegalSection title="Responsabilité">
        <p>
          Le service est fourni sans garantie de disponibilité continue. Notre
          responsabilité est limitée aux sommes effectivement versées au cours
          des douze derniers mois. Rien dans ces conditions n&apos;écarte les
          garanties légales dont bénéficie un consommateur.
        </p>
      </LegalSection>

      <LegalSection title="Litiges">
        <p>
          Droit français. Avant toute action, écrivez à {e.contactEmail} : la
          plupart des différends se règlent ainsi. À défaut, un consommateur
          peut recourir gratuitement à un médiateur de la consommation, ou à la
          plateforme européenne de règlement en ligne des litiges.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
