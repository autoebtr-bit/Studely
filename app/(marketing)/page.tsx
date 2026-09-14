import type { Metadata } from "next";
import { HeroSection } from "@/components/marketing/hero-section";
import { ProblemSection } from "@/components/marketing/problem-section";
import { DifferenceSection } from "@/components/marketing/difference-section";
import { ProgressSection } from "@/components/marketing/progress-section";
import { FeaturesSection } from "@/components/marketing/features-section";
import { FilieresSection } from "@/components/marketing/filieres-section";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { TestimonialsSection } from "@/components/marketing/testimonials-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { FinalCtaSection } from "@/components/marketing/final-cta-section";

/**
 * Le titre porte « khôlle », la description porte « colle » : la première
 * orthographe signale qu'on connaît le milieu, la seconde est bien plus tapée
 * dans un moteur de recherche. Les deux doivent figurer sur la page.
 */
export const metadata: Metadata = {
  // `absolute` : sans lui, le gabarit du layout racine ajouterait « · Studely »
  // à un titre qui contient déjà la marque.
  title: { absolute: "Studely — Entraîne-toi aux khôlles de prépa" },
  description:
    "Passe une colle blanche avant la vraie. Un examinateur t'interroge à l'oral sur ton programme de khôlle : question de cours, exercice au tableau, relances, note sur 20. MPSI, PCSI, ECG, khâgne, langues et Grand Oral.",
  keywords: [
    "khôlle",
    "colle prépa",
    "oral prépa",
    "khôlle maths",
    "MPSI",
    "PCSI",
    "ECG",
    "khâgne",
    "Grand Oral",
    "concours",
  ],
  openGraph: {
    title: "Studely — Entraîne-toi aux khôlles de prépa",
    description:
      "Un examinateur qui t'interroge à l'oral, t'interrompt et te note. Question de cours, exercice au tableau, fiche notée sur 20.",
    type: "website",
    locale: "fr_FR",
  },
};

/**
 * Page d'accueil publique.
 *
 * Elle ne fait qu'assembler des sections : toute la mise en forme vit dans
 * `components/marketing/`, et tout le texte dans `lib/marketing/content.ts`.
 */
export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <ProblemSection />
      {/* Juste après le constat : c'est là que naît l'objection « je peux
          demander ça à une IA ». */}
      <DifferenceSection />
      {/* Le sixième mécanisme, celui qui demandait d'être montré plutôt que dit. */}
      <ProgressSection />
      <FeaturesSection />
      <FilieresSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <PricingSection />
      <FinalCtaSection />
    </>
  );
}
