import { z } from "zod";
import { describeAiError } from "@/lib/ai/client";
import { EFFORT, MODEL } from "@/lib/ai/models";
import {
  SYSTEM_KHOLLE_GRADE,
  SYSTEM_KHOLLE_RELANCE,
  SYSTEM_KHOLLE_SUBJECT,
} from "@/lib/ai/prompts";
import {
  kholleGradeSchema,
  kholleRelanceSchema,
  kholleSubjectSchema,
} from "@/lib/ai/schemas";
import { generateStructured } from "@/lib/ai/generate";
import { guardAiRoute, logAiUsage } from "@/lib/ai/guard";
import {
  getFormat,
  playablePhases,
  type KholleFormat,
} from "@/lib/kholle/formats";
import { weightedScore } from "@/lib/kholle/history";
import type { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Dix secondes par défaut en production : une génération d’Opus les dépasse.
export const maxDuration = 60;

/**
 * Moteur de khôlle.
 *
 * Trois actions, volontairement sur une seule route car elles partagent le
 * format et le contexte de la séance :
 *  - `subject` prépare le sujet à partir du programme de la semaine ;
 *  - `relance` décide, en cours de réponse, si le khôlleur intervient ;
 *  - `grade` note la prestation selon les critères du format.
 *
 * La consigne propre au format voyage dans le message utilisateur, jamais dans
 * le prompt système : c'est ce qui préserve le cache de prompt entre filières.
 */
const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("subject"),
    formatId: z.string().min(1),
    chapterId: z.string().uuid().optional(),
    /** Programme de khôlle saisi à la main quand aucun chapitre n'est importé. */
    programme: z.string().min(10).max(4000).optional(),
    level: z.string().max(60).optional(),
  }),
  z.object({
    action: z.literal("relance"),
    formatId: z.string().min(1),
    phaseId: z.string().min(1),
    prompt: z.string().min(1).max(4000),
    expectedPoints: z.array(z.string()).max(12).default([]),
    /** Ce que l'élève a dit depuis le début de la phase. */
    transcript: z.string().min(1).max(12_000),
    /** Relances déjà posées, pour ne pas se répéter. */
    previousRelances: z.array(z.string()).max(8).default([]),
  }),
  z.object({
    action: z.literal("grade"),
    formatId: z.string().min(1),
    answers: z
      .array(
        z.object({
          phaseId: z.string(),
          prompt: z.string(),
          expectedPoints: z.array(z.string()).default([]),
          transcript: z.string(),
          relances: z.array(z.string()).default([]),
        }),
      )
      .min(1)
      .max(5),
  }),
]);

/**
 * Ce que coûte chaque action.
 *
 * Une khôlle vaut UNE unité, réservée au lancement du sujet. La notation
 * n'est plus décomptée : un élève coupé avant sa fiche aurait perdu vingt
 * minutes d'oral pour rien — la pire panne possible sur ce produit.
 *
 * Les relances restent sur le quota de messages : elles coûtent peu, et le
 * schéma en borne déjà le nombre par phase.
 */
const QUOTA_BY_ACTION = {
  subject: "kholle",
  relance: "ai_messages",
  grade: null,
} as const;

/**
 * Fin du transcrit envoyée à une relance, en caractères.
 *
 * L'examinateur réagit à ce qui vient d'être dit ; renvoyer les 12 000
 * caractères complets à chaque relance coûtait quatre fois le prix pour la même
 * décision, et sans cache possible puisque le texte change à chaque appel.
 */
const RELANCE_TAIL_CHARS = 2_500;

function tail(text: string, max: number): string {
  if (text.length <= max) return text;
  return `…${text.slice(-max)}`;
}

/**
 * Enregistre la khôlle notée, puis crédite l'XP.
 *
 * C'est ce qui fait exister la courbe de progression : sans cette écriture, la
 * fiche disparaît au rechargement et l'élève ne voit jamais ce qu'il a gagné
 * depuis trois semaines.
 *
 * Volontairement silencieuse en cas d'échec : la fiche vient d'être produite et
 * payée, elle doit parvenir à l'élève même si l'enregistrement échoue. On perd
 * un point sur la courbe, pas la séance.
 */
async function saveSession(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  format: KholleFormat,
  grade: z.infer<typeof kholleGradeSchema>,
): Promise<string | null> {
  try {
    const { data: session, error } = await supabase
      .from("kholle_sessions")
      .insert({
        user_id: userId,
        format_id: format.id,
        filiere: format.filieres[0] ?? null,
        score: grade.score,
        verdict: grade.verdict,
        strengths: grade.strengths,
        improvements: grade.improvements,
        missed_points: grade.missedPoints,
      })
      .select("id")
      .single();

    if (error || !session) return null;

    // Les critères inconnus du format sont écartés : le modèle est contraint
    // par le schéma, mais la clé primaire composite, elle, ne pardonne pas.
    const known = new Set(format.criteria.map((c) => c.id));
    const rows = grade.perCriterion
      .filter((entry) => known.has(entry.criterionId))
      .map((entry) => ({
        session_id: session.id,
        criterion_id: entry.criterionId,
        score: entry.score,
        comment: entry.comment,
      }));

    if (rows.length > 0) {
      await supabase.from("kholle_criterion_scores").insert(rows);
    }

    // L'XP n'est jamais attribuée depuis le client : la RPC calcule le montant,
    // applique le plafond journalier et déduplique sur la clé d'idempotence.
    await supabase.rpc("award_xp", {
      p_kind: "oral_session_completed",
      p_scope: session.id,
      p_context: { score20: grade.score },
      p_ref_table: "kholle_sessions",
      p_ref_id: session.id,
    });

    return session.id;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const raw = await request.clone().json().catch(() => null);
  const action =
    typeof raw === "object" && raw !== null
      ? (raw as { action?: keyof typeof QUOTA_BY_ACTION }).action
      : undefined;

  // `grade` vaut `null` : il est inclus dans la khôlle déjà réservée, donc
  // authentifié et validé, mais ne consomme rien.
  const guard = await guardAiRoute(
    request,
    bodySchema,
    action ? QUOTA_BY_ACTION[action] : "kholle",
  );
  if (!guard.ok) return guard.response;

  const { body, supabase, userId, kholleSource } = guard;

  /**
   * Rend la khôlle débitée quand la génération du sujet échoue.
   *
   * Le quota est prélevé avant l'appel au modèle — sans quoi on pourrait
   * déclencher un appel facturé puis se voir refuser. Mais si le modèle tombe,
   * l'élève perdrait une khôlle sans rien recevoir : sur un essai de trois,
   * c'est un tiers du produit parti sur une panne qui n'est pas la sienne.
   *
   * Silencieux en cas d'échec du remboursement lui-même : on renvoie l'erreur
   * d'origine, qui est celle que l'élève doit lire.
   */
  async function refundKholle(): Promise<void> {
    if (!kholleSource) return;
    try {
      await supabase.rpc("refund_kholle", { p_source: kholleSource });
    } catch {
      /* rien à faire de plus */
    }
  }

  const format = getFormat(body.formatId);
  if (!format) {
    // Le quota est déjà débité à ce stade : tout refus précoce doit rendre.
    await refundKholle();
    return Response.json({ error: "Format de khôlle inconnu." }, { status: 400 });
  }

  try {
    /* ------------------------------------------------------------ Sujet -- */
    if (body.action === "subject") {
      let programme = body.programme ?? "";

      // Le programme peut venir d'un chapitre importé ou d'une saisie libre :
      // beaucoup d'élèves ont leur programme de khôlle sur une feuille, pas
      // sous forme de cours numérisé.
      if (body.chapterId) {
        const { data: lessons } = await supabase
          .from("lessons")
          .select("title, content_md")
          .eq("chapter_id", body.chapterId)
          .order("position");

        if (lessons?.length) {
          programme = lessons
            .map((l) => `## ${l.title}\n\n${l.content_md}`)
            .join("\n\n");
        }
      }

      if (!programme.trim()) {
        await refundKholle();
        return Response.json(
          { error: "Indique le programme de la khôlle, ou choisis un chapitre." },
          { status: 400 },
        );
      }

      const phases = playablePhases(format);

      const { data, usage } = await generateStructured({
        system: SYSTEM_KHOLLE_SUBJECT,
        user:
          `<consigne_examinateur>\n${format.examinerBrief}\n</consigne_examinateur>\n\n` +
          `<filieres>${format.filieres.join(", ")}</filieres>\n` +
          (body.level ? `<niveau>${body.level}</niveau>\n` : "") +
          `<phases>\n` +
          phases
            .map(
              (p) =>
                `- ${p.id} — « ${p.label} » (${p.minutes} min) : ${p.instruction}`,
            )
            .join("\n") +
          `\n</phases>\n\n` +
          `<programme_de_kholle>\n${programme}\n</programme_de_kholle>\n\n` +
          `Prépare un sujet pour chacune de ces phases, dans l'ordre. ` +
          `Reprends exactement les identifiants de phase fournis.`,
        schema: kholleSubjectSchema,
        effort: EFFORT.kholleSubject,
      });

      await logAiUsage(supabase, {
        userId,
        route: "/api/ai/kholle#subject",
        model: MODEL,
        ...usage,
      });

      return Response.json(data);
    }

    /* ---------------------------------------------------------- Relance -- */
    if (body.action === "relance") {
      const phase = format.phases.find((p) => p.id === body.phaseId);

      // Certaines phases se déroulent sans interruption : l'exposé se tient
      // d'un bloc, on ne coupe qu'à l'entretien.
      if (!phase?.interruptive) {
        return Response.json({
          shouldInterrupt: false,
          relance: "",
          reason: "Phase sans interruption.",
        });
      }

      const { data, usage } = await generateStructured({
        system: SYSTEM_KHOLLE_RELANCE,
        user:
          `<consigne_examinateur>\n${format.examinerBrief}\n</consigne_examinateur>\n\n` +
          `<sujet>${body.prompt}</sujet>\n\n` +
          `<points_attendus>\n${body.expectedPoints.map((p) => `- ${p}`).join("\n")}\n</points_attendus>\n\n` +
          (body.previousRelances.length
            ? `<relances_deja_posees>\n${body.previousRelances.map((r) => `- ${r}`).join("\n")}\n</relances_deja_posees>\n\n`
            : "") +
          `<ce_que_leleve_a_dit>\n${tail(body.transcript, RELANCE_TAIL_CHARS)}\n</ce_que_leleve_a_dit>\n\n` +
          `Décide si tu interviens maintenant.`,
        schema: kholleRelanceSchema,
        // Une relance doit tomber vite : l'élève parle, il attend.
        effort: "low",
        maxTokens: 1200,
      });

      await logAiUsage(supabase, {
        userId,
        route: "/api/ai/kholle#relance",
        model: MODEL,
        ...usage,
      });

      return Response.json(data);
    }

    /* ------------------------------------------------------------- Note -- */
    const { data, usage } = await generateStructured({
      system: SYSTEM_KHOLLE_GRADE,
      user:
        `<consigne_examinateur>\n${format.examinerBrief}\n</consigne_examinateur>\n\n` +
        `<criteres>\n` +
        format.criteria
          .map(
            (c) => `- ${c.id} — « ${c.label} » (${c.weight} %) : ${c.description}`,
          )
          .join("\n") +
        `\n</criteres>\n\n` +
        `<deroule>\n` +
        body.answers
          .map((a) => {
            const phase = format.phases.find((p) => p.id === a.phaseId);
            return (
              `### ${phase?.label ?? a.phaseId} (${phase?.weight ?? 0} % de la note)\n` +
              `Sujet : ${a.prompt}\n` +
              `Points attendus : ${a.expectedPoints.join(" | ") || "non précisés"}\n` +
              (a.relances.length
                ? `Relances posées : ${a.relances.join(" | ")}\n`
                : "") +
              `Réponse de l'élève : ${a.transcript || "(aucune réponse)"}`
            );
          })
          .join("\n\n") +
        `\n</deroule>\n\n` +
        `Note cette khôlle. Reprends exactement les identifiants de critère fournis.`,
      schema: kholleGradeSchema,
      effort: EFFORT.gradeOral,
    });

    await logAiUsage(supabase, {
      userId,
      route: "/api/ai/kholle#grade",
      model: MODEL,
      ...usage,
    });

    /*
     * La note globale est recalculée depuis les critères et leurs poids.
     *
     * Le modèle renvoie les deux, mais rien ne garantit que son addition tombe
     * juste — et une fiche qui annonce 14,5 au-dessus de critères qui font 13,6
     * se fait démonter par le premier élève qui vérifie. Les poids somment à
     * 100 par construction : la note globale est de l'arithmétique, pas un
     * jugement, donc on la calcule.
     */
    const graded = {
      ...data,
      score: weightedScore(data.perCriterion, format.criteria) ?? data.score,
    };

    const sessionId = await saveSession(supabase, userId, format, graded);

    return Response.json({ ...graded, sessionId });
  } catch (error) {
    // Le modèle a échoué après le débit : on rend la khôlle. Sans effet sur
    // `relance` et `grade`, qui n'en consomment pas.
    await refundKholle();

    const { status, message } = describeAiError(error);
    return Response.json({ error: message }, { status });
  }
}
