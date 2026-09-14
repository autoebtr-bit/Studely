import { z } from "zod";

/**
 * Schémas des sorties structurées de l'IA.
 *
 * Chaque schéma sert deux fois : il contraint la génération côté Anthropic
 * (via `zodOutputFormat`) et il valide la réponse avant écriture en base.
 * Les `describe()` ne sont pas décoratifs — ils font partie du prompt et
 * pilotent la qualité de ce que le modèle produit.
 */

export const flashcardSchema = z.object({
  front: z
    .string()
    .min(5)
    .max(300)
    .describe("La question, formulée pour forcer un rappel actif, pas une reconnaissance."),
  back: z
    .string()
    .min(2)
    .max(600)
    .describe("La réponse, complète mais tenant en quelques lignes."),
});

export const flashcardSetSchema = z.object({
  cards: z
    .array(flashcardSchema)
    .min(3)
    .max(30)
    .describe("Une carte par notion atomique. Ne jamais regrouper deux idées."),
});

export const exerciseSchema = z.object({
  prompt: z.string().min(10).describe("L'énoncé, autosuffisant."),
  difficulty: z.enum(["facile", "moyen", "difficile"]),
  minutes: z.number().int().min(1).max(120).describe("Durée conseillée."),
  solution: z.string().min(10).describe("La correction détaillée et rédigée."),
  rubric: z
    .array(
      z.object({
        criterion: z.string().describe("Ce qui est évalué."),
        points: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .describe("Barème, pour que la notation soit reproductible."),
});

export const exerciseSetSchema = z.object({
  exercises: z.array(exerciseSchema).min(1).max(10),
});

export const exerciseGradeSchema = z.object({
  score: z.number().int().min(0).max(100).describe("Note sur 100."),
  comment: z
    .string()
    .min(20)
    .describe("Appréciation générale, franche mais encourageante."),
  strengths: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe("Ce qui est réussi, formulé concrètement."),
  improvements: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe("Ce qu'il faut corriger, avec l'action à faire."),
});

export const lessonExtractionSchema = z.object({
  title: z.string().min(3).max(200).describe("Titre du chapitre détecté."),
  lessons: z
    .array(
      z.object({
        title: z.string().min(3).max(200),
        contentMd: z.string().min(50).describe("Le cours en Markdown, structuré."),
        summaryMd: z.string().min(20).max(600).describe("Résumé en 2 à 4 phrases."),
        readingMinutes: z.number().int().min(1).max(60),
      }),
    )
    .min(1)
    .max(15)
    .describe("Découpage en leçons cohérentes, une notion majeure par leçon."),
});

export const podcastScriptSchema = z.object({
  title: z.string().min(3).max(200),
  sections: z
    .array(z.string().min(20))
    .min(3)
    .max(20)
    .describe(
      "Texte destiné à être LU À VOIX HAUTE : phrases courtes, aucun symbole " +
        "mathématique brut, les formules énoncées en toutes lettres.",
    ),
  durationEstS: z.number().int().min(30).max(3600),
});

export const studyPlanSchema = z.object({
  sessions: z
    .array(
      z.object({
        dayOffset: z
          .number()
          .int()
          .min(0)
          .describe("Nombre de jours à partir d'aujourd'hui."),
        startTime: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .describe("Heure au format HH:MM."),
        durationMin: z.number().int().min(10).max(240),
        chapterId: z.string().describe("Identifiant du chapitre travaillé."),
        type: z.enum(["cours", "flashcards", "exercices", "annale", "oral"]),
        rationale: z
          .string()
          .describe("Pourquoi cette séance à ce moment — sert à expliquer le plan."),
      }),
    )
    .min(1)
    .max(200),
});

/* ---------------------------------------------------------------- Khôlle -- */

export const kholleSubjectSchema = z.object({
  phases: z
    .array(
      z.object({
        phaseId: z
          .string()
          .describe("Identifiant de la phase du format, repris tel quel."),
        prompt: z
          .string()
          .min(10)
          .describe("Le sujet énoncé à l'élève, tel qu'un khôlleur le formulerait."),
        expectedPoints: z
          .array(z.string())
          .min(2)
          .max(10)
          .describe(
            "Ce qu'une réponse complète doit contenir. Sert de barème à la " +
              "notation : pour une question de cours, chaque hypothèse compte " +
              "comme un point attendu distinct.",
          ),
        /** Sert à rassurer l'élève après coup, jamais pendant. */
        modelAnswer: z
          .string()
          .describe("Réponse attendue, rédigée, affichée uniquement après la khôlle."),
      }),
    )
    .min(1)
    .max(5),
});

export const kholleRelanceSchema = z.object({
  shouldInterrupt: z
    .boolean()
    .describe("Vrai seulement si une intervention est réellement justifiée."),
  relance: z
    .string()
    .describe(
      "La question posée à l'élève, courte et sans la réponse. Chaîne vide si " +
        "aucune intervention n'est nécessaire.",
    ),
  reason: z
    .string()
    .describe("Ce qui déclenche l'intervention, pour le compte rendu final."),
});

export const kholleGradeSchema = z.object({
  score: z.number().min(0).max(20).describe("Note globale sur 20."),
  perCriterion: z
    .array(
      z.object({
        criterionId: z.string(),
        score: z.number().min(0).max(20),
        comment: z.string().min(10),
      }),
    )
    .min(1)
    .describe("Une note et un commentaire par critère du format."),
  strengths: z.array(z.string()).min(1).max(4),
  improvements: z
    .array(z.string())
    .min(1)
    .max(4)
    .describe("Chaque point indique l'action à mener, pas seulement le constat."),
  verdict: z
    .string()
    .min(30)
    .describe("Appréciation générale, franche, telle qu'un khôlleur la dirait."),
  missedPoints: z
    .array(z.string())
    .describe("Points attendus qui n'ont pas été mentionnés par l'élève."),
});

/* ------------------------------------------------------------- Types dérivés */

export type FlashcardSet = z.infer<typeof flashcardSetSchema>;
export type ExerciseSet = z.infer<typeof exerciseSetSchema>;
export type ExerciseGrade = z.infer<typeof exerciseGradeSchema>;
export type LessonExtraction = z.infer<typeof lessonExtractionSchema>;
export type PodcastScript = z.infer<typeof podcastScriptSchema>;
export type StudyPlan = z.infer<typeof studyPlanSchema>;
export type KholleSubject = z.infer<typeof kholleSubjectSchema>;
export type KholleRelance = z.infer<typeof kholleRelanceSchema>;
export type KholleGrade = z.infer<typeof kholleGradeSchema>;
