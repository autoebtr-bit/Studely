import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_ENTITY } from "@/lib/legal/entity";
import {
  LegalField,
  LegalPage,
  LegalSection,
} from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Mentions légales",
  description:
    "Identité de l'éditeur, hébergement et conditions d'utilisation de Studely.",
  // Une page légale n'a aucune raison de remonter dans les résultats de
  // recherche, mais elle doit rester accessible : on la retire de l'index sans
  // en bloquer l'accès.
  robots: { index: false, follow: true },
};

export default function MentionsLegalesPage() {
  const e = LEGAL_ENTITY;

  return (
    <LegalPage title="Mentions légales" updatedAt="13 septembre 2026">
      <LegalSection title="Éditeur du site">
        <LegalField label="Dénomination" value={e.publisher} />
        <LegalField label="Forme juridique" value={e.legalForm} />
        <LegalField label="Capital social" value={e.capital} />
        <LegalField label="SIRET" value={e.siret} />
        <LegalField label="TVA intracommunautaire" value={e.vatNumber} />
        <LegalField label="Siège social" value={e.address} />
        <LegalField label="Directeur de la publication" value={e.publicationDirector} />
        <LegalField label="Contact" value={e.contactEmail} />
      </LegalSection>

      <LegalSection title="Hébergement">
        <LegalField label="Hébergeur du site" value={e.host} />
        <p>
          Les données de compte et les documents déposés sont hébergés dans
          l&apos;Union européenne. Le détail des services utilisés figure dans la{" "}
          <Link href="/confidentialite" className="text-brand-600 underline">
            politique de confidentialité
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="Objet du service">
        <p>
          {e.siteName} est un service d&apos;entraînement aux khôlles : un
          examinateur simulé interroge l&apos;élève à l&apos;oral, l&apos;interrompt,
          puis rend une note et une appréciation détaillées.
        </p>
        <p>
          Les sujets, corrections et notes sont produits par un modèle de langage.
          Ils constituent une aide à la préparation et{" "}
          <strong>
            ne préjugent en rien des notes obtenues lors des épreuves réelles
          </strong>
          . Ils ne remplacent ni un enseignant, ni un colleur, ni le programme
          officiel.
        </p>
      </LegalSection>

      <LegalSection title="Compte et accès">
        <p>
          L&apos;accès aux fonctions d&apos;entraînement suppose la création
          d&apos;un compte. Chaque inscription ouvre droit à un essai gratuit
          limité, accordé une seule fois par personne.
        </p>
        <p>
          L&apos;élève est responsable de la confidentialité de ses identifiants.
          Un compte peut être suspendu en cas d&apos;usage manifestement abusif,
          notamment la création répétée de comptes destinée à contourner la
          limite de l&apos;essai gratuit.
        </p>
      </LegalSection>

      <LegalSection title="Contenus déposés">
        <p>
          Les cours téléversés restent la propriété de leur auteur. En les
          déposant, l&apos;élève déclare avoir le droit de les utiliser et
          autorise {e.siteName} à les traiter dans le seul but de produire ses
          fiches, exercices, podcasts et sujets de khôlle.
        </p>
        <p>
          Ces documents ne sont accessibles qu&apos;au compte qui les a déposés.
          Ils ne sont ni publiés, ni partagés, ni utilisés pour entraîner un
          modèle.
        </p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          La marque {e.siteName}, l&apos;interface, les textes du site et la
          méthode d&apos;évaluation sont protégés. Toute reproduction, hors
          usage personnel, suppose un accord écrit préalable.
        </p>
      </LegalSection>

      <LegalSection title="Disponibilité">
        <p>
          Le service est fourni sans garantie de disponibilité continue. Des
          interruptions peuvent survenir pour maintenance, ou du fait des
          services tiers dont dépend le fonctionnement de l&apos;application.
        </p>
      </LegalSection>

      <LegalSection title="Droit applicable">
        <p>
          Les présentes mentions sont soumises au droit français. En cas de
          litige, une solution amiable sera recherchée avant toute action
          judiciaire. Un consommateur peut recourir gratuitement à un médiateur
          de la consommation.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
