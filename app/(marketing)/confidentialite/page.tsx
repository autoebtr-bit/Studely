import type { Metadata } from "next";
import Link from "next/link";
import {
  AGE_CONSENTEMENT,
  DATA_CATEGORIES,
  LEGAL_ENTITY,
  PROCESSORS,
} from "@/lib/legal/entity";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Quelles données Studely collecte, pourquoi, à qui elles sont transmises et comment les supprimer.",
  robots: { index: false, follow: true },
};

export default function ConfidentialitePage() {
  const e = LEGAL_ENTITY;

  return (
    <LegalPage
      title="Politique de confidentialité"
      updatedAt="13 septembre 2026"
    >
      <LegalSection title="En résumé">
        <p>
          {e.siteName} traite vos cours et vos réponses pour vous entraîner aux
          khôlles. Rien n&apos;est publié, rien n&apos;est revendu, et vos
          documents ne servent à entraîner aucun modèle. Vous pouvez supprimer
          votre compte et vos données à tout moment.
        </p>
        <p>
          Un point mérite votre attention : pour produire un sujet ou une
          correction, le contenu de vos cours est transmis à un prestataire
          d&apos;intelligence artificielle. C&apos;est détaillé plus bas.
        </p>
      </LegalSection>

      <LegalSection title="Responsable du traitement">
        <p>
          {e.publisher}, joignable à l&apos;adresse {e.contactEmail}. Toute
          demande relative à vos données est traitée à cette adresse.
        </p>
      </LegalSection>

      <LegalSection title="Données traitées">
        <div className="space-y-5">
          {DATA_CATEGORIES.map((category) => (
            <div key={category.title}>
              <p className="font-medium text-slate-900">{category.title}</p>
              <p className="mt-1">{category.items}</p>
              <p className="mt-1 text-slate-500">
                <span className="font-medium">Base légale :</span>{" "}
                {category.basis}
              </p>
              <p className="text-slate-500">
                <span className="font-medium">Conservation :</span>{" "}
                {category.retention}
              </p>
            </div>
          ))}
        </div>
      </LegalSection>

      <LegalSection title="Ce que nous ne faisons pas">
        <p>
          Aucune revente ni cession de données à des tiers à des fins
          commerciales. Aucune publicité ciblée. Aucun profilage automatisé
          produisant des effets juridiques à votre égard : les notes de khôlle
          sont un outil d&apos;entraînement, elles ne conditionnent aucune
          décision vous concernant.
        </p>
        <p>
          Aucun traceur publicitaire n&apos;est déposé. Les seuls témoins de
          connexion utilisés sont ceux qui maintiennent votre session ouverte ;
          ils sont strictement nécessaires au fonctionnement du service et ne
          requièrent donc pas de consentement préalable.
        </p>
      </LegalSection>

      <LegalSection title="Prestataires">
        <p>
          Le service s&apos;appuie sur les prestataires suivants, qui
          n&apos;agissent que sur nos instructions :
        </p>
        <div className="mt-3 space-y-4">
          {PROCESSORS.map((processor) => (
            <div key={processor.name}>
              <p className="font-medium text-slate-900">{processor.name}</p>
              <p className="mt-1">{processor.purpose}</p>
              <p className="text-slate-500">{processor.location}</p>
            </div>
          ))}
        </div>
      </LegalSection>

      <LegalSection title="Vos droits">
        <p>
          Vous disposez d&apos;un droit d&apos;accès, de rectification,
          d&apos;effacement, de limitation, d&apos;opposition et de portabilité
          sur vos données. Écrivez à {e.contactEmail} : une réponse vous est due
          dans un délai d&apos;un mois.
        </p>
        <p>
          La suppression de votre compte entraîne celle de vos cours, fiches,
          copies et khôlles. Une trace technique sans contenu est conservée pour
          empêcher qu&apos;un nouvel essai gratuit soit obtenu en supprimant puis
          recréant un compte.
        </p>
        <p>
          En cas de désaccord, vous pouvez saisir la Commission nationale de
          l&apos;informatique et des libertés (CNIL), 3 place de Fontenoy,
          75007 Paris.
        </p>
      </LegalSection>

      <LegalSection title="Élèves mineurs">
        <p>
          Le service s&apos;adresse à des lycéens et à des étudiants, dont une
          partie est mineure. En dessous de {AGE_CONSENTEMENT} ans, la création
          d&apos;un compte suppose l&apos;accord d&apos;un titulaire de
          l&apos;autorité parentale, qui peut exercer les droits ci-dessus à la
          place de l&apos;élève.
        </p>
      </LegalSection>

      <LegalSection title="Sécurité">
        <p>
          Les échanges sont chiffrés. Les mots de passe ne sont jamais conservés
          en clair. Chaque compte est cloisonné au niveau de la base de données
          elle-même : une requête ne peut techniquement pas atteindre les
          données d&apos;un autre élève, y compris en cas de faille
          applicative.
        </p>
      </LegalSection>

      <LegalSection title="Modifications">
        <p>
          Cette politique peut évoluer avec le service. La date de dernière mise
          à jour figure en haut de page. Les{" "}
          <Link href="/mentions-legales" className="text-brand-600 underline">
            mentions légales
          </Link>{" "}
          précisent l&apos;identité de l&apos;éditeur.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
