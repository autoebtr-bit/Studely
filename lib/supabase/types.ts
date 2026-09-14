/**
 * Types de la base.
 *
 * À terme ce fichier est REGÉNÉRÉ, il ne se modifie pas à la main :
 *   supabase gen types typescript --local > lib/supabase/types.ts
 *
 * La version ci-dessous est écrite à la main pour que l'application compile
 * avant la première génération ; elle décrit exactement le schéma des
 * migrations 0001 à 0007. Toute divergence sera corrigée par la génération.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/* ------------------------------------------------------------------ Énums -- */

export type LessonSource = "manuel" | "pdf" | "image" | "texte";
export type LessonStatus = "brouillon" | "pret" | "erreur";
export type DocumentStatus = "en_attente" | "traitement" | "pret" | "erreur";
export type Difficulty = "facile" | "moyen" | "difficile";
export type MessageRole = "user" | "assistant";
export type SessionType =
  | "cours"
  | "flashcards"
  | "exercices"
  | "annale"
  | "oral";
export type SessionStatus = "a_faire" | "fait" | "reporte";
export type PodcastStatus = "en_attente" | "pret" | "erreur";
export type PlanTier = "gratuit" | "pro";
export type SubscriptionStatus = "actif" | "essai" | "en_retard" | "annule";

/* --------------------------------------------------------------- Utilitaire */

/** Clés dont le type admet `null` : en base, elles ont une valeur par défaut. */
type NullableKeys<Row> = {
  [K in keyof Row]-?: null extends Row[K] ? K : never;
}[keyof Row];

/**
 * Décrit une table à partir de sa ligne.
 *
 * Sont optionnelles à l'insertion : les colonnes explicitement listées
 * (celles qui ont un DEFAULT en base) et toutes les colonnes nullables,
 * qui valent NULL si on ne les fournit pas.
 */
type TableOf<Row, Optional extends keyof Row = never> = {
  Row: Row;
  Insert: Omit<Row, Optional | NullableKeys<Row>> &
    Partial<Pick<Row, Optional | NullableKeys<Row>>>;
  Update: Partial<Row>;
  Relationships: [];
};

/* ----------------------------------------------------------------- Lignes -- */

export type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  study_level: string | null;
  exam_date: string | null;
  xp_total: number;
  level: number;
  streak_current: number;
  streak_best: number;
  last_active_date: string | null;
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SubjectRow = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  emoji: string | null;
  position: number;
  created_at: string;
}

export type ChapterRow = {
  id: string;
  subject_id: string;
  user_id: string;
  title: string;
  position: number;
  progress_pct: number;
  created_at: string;
}

export type LessonRow = {
  id: string;
  chapter_id: string;
  user_id: string;
  title: string;
  content_md: string;
  summary_md: string | null;
  reading_minutes: number;
  position: number;
  source_type: LessonSource;
  source_path: string | null;
  status: LessonStatus;
  completed_at: string | null;
  created_at: string;
}

export type DocumentRow = {
  id: string;
  user_id: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  status: DocumentStatus;
  extracted_text: string | null;
  error_message: string | null;
  created_at: string;
}

export type FlashcardRow = {
  id: string;
  user_id: string;
  chapter_id: string;
  source_lesson_id: string | null;
  front: string;
  back: string;
  created_at: string;
}

export type FlashcardStateRow = {
  card_id: string;
  user_id: string;
  ease: number;
  interval_days: number;
  reps: number;
  lapses: number;
  due_at: string;
  last_review_at: string | null;
}

export type ExerciseRow = {
  id: string;
  user_id: string;
  chapter_id: string;
  prompt: string;
  solution: string | null;
  rubric: Json;
  difficulty: Difficulty;
  minutes: number;
  created_at: string;
}

export type ExerciseAttemptRow = {
  id: string;
  exercise_id: string;
  user_id: string;
  answer: string;
  score: number | null;
  feedback: Json | null;
  created_at: string;
}

export type OralSessionRow = {
  id: string;
  user_id: string;
  chapter_id: string;
  score: number | null;
  transcript: Json;
  feedback: Json | null;
  started_at: string;
  ended_at: string | null;
}

export type AiConversationRow = {
  id: string;
  user_id: string;
  chapter_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export type AiMessageRow = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: MessageRole;
  content: string;
  tokens_in: number | null;
  tokens_out: number | null;
  created_at: string;
}

export type StudyPlanRow = {
  id: string;
  user_id: string;
  exam_date: string;
  params: Json;
  generated_at: string;
  is_active: boolean;
}

export type StudySessionRow = {
  id: string;
  plan_id: string;
  user_id: string;
  chapter_id: string | null;
  scheduled_on: string;
  start_time: string | null;
  duration_min: number;
  type: SessionType;
  status: SessionStatus;
  completed_at: string | null;
}

export type PodcastRow = {
  id: string;
  user_id: string;
  chapter_id: string;
  title: string;
  script: Json;
  duration_est_s: number;
  status: PodcastStatus;
  created_at: string;
}

export type AnnaleRow = {
  id: string;
  subject_slug: string;
  subject_label: string;
  year: number;
  session_label: string;
  level: string;
  duration_minutes: number;
  storage_path: string | null;
  is_public: boolean;
  created_at: string;
}

export type AnnaleAttemptRow = {
  id: string;
  annale_id: string;
  user_id: string;
  score: number | null;
  duration_s: number | null;
  notes: string | null;
  created_at: string;
}

export type LevelRow = {
  level: number;
  xp_required: number;
  title: string;
}

export type XpRuleRow = {
  kind: string;
  base: number;
  daily_cap: number | null;
  label: string;
}

export type XpEventRow = {
  id: string;
  user_id: string;
  kind: string;
  amount: number;
  ref_table: string | null;
  ref_id: string | null;
  idempotency_key: string;
  created_at: string;
}

export type AchievementRow = {
  code: string;
  title: string;
  description: string;
  emoji: string;
  criteria: Json;
}

export type UserAchievementRow = {
  user_id: string;
  achievement_code: string;
  unlocked_at: string;
}

export type SubscriptionRow = {
  user_id: string;
  plan: PlanTier;
  status: SubscriptionStatus;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  updated_at: string;
}

export type UsageCounterRow = {
  user_id: string;
  day: string;
  ai_messages: number;
  ai_generations: number;
}

export type AiUsageLogRow = {
  id: string;
  user_id: string;
  route: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  cache_read: number;
  cost_est_usd: number | null;
  created_at: string;
}

export type PlanLimitRow = {
  plan: PlanTier;
  ai_messages_day: number;
  ai_generations_day: number;
  kholles_per_period: number;
  kholle_period: KhollePeriod;
}

/** Rythme de renouvellement du budget de khôlles. */
export type KhollePeriod = "week" | "month";

/** D'où vient la khôlle réservée : bienvenue, ou allocation du plan. */
export type KholleSource = "offerte" | "plan";

export type KholleCreditRow = {
  user_id: string;
  remaining: number;
  granted_at: string;
}

export type KholleUsageRow = {
  user_id: string;
  period_start: string;
  used: number;
}

export type KholleSessionRow = {
  id: string;
  user_id: string;
  format_id: string;
  filiere: string | null;
  score: number;
  verdict: string;
  strengths: Json;
  improvements: Json;
  missed_points: Json;
  created_at: string;
}

export type KholleCriterionScoreRow = {
  session_id: string;
  criterion_id: string;
  score: number;
  comment: string;
}

/* --------------------------------------------------------------- Database -- */

export type Database = {
  public: {
    Tables: {
      profiles: TableOf<ProfileRow, "created_at" | "updated_at">;
      subjects: TableOf<SubjectRow, "id" | "created_at" | "position">;
      chapters: TableOf<ChapterRow, "id" | "created_at" | "position" | "progress_pct">;
      lessons: TableOf<LessonRow, "id" | "created_at" | "position">;
      documents: TableOf<DocumentRow, "id" | "created_at">;
      flashcards: TableOf<FlashcardRow, "id" | "created_at">;
      flashcard_states: TableOf<FlashcardStateRow, "due_at">;
      exercises: TableOf<ExerciseRow, "id" | "created_at">;
      exercise_attempts: TableOf<ExerciseAttemptRow, "id" | "created_at">;
      oral_sessions: TableOf<OralSessionRow, "id" | "started_at">;
      ai_conversations: TableOf<AiConversationRow, "id" | "created_at" | "updated_at">;
      ai_messages: TableOf<AiMessageRow, "id" | "created_at">;
      study_plans: TableOf<StudyPlanRow, "id" | "generated_at">;
      study_sessions: TableOf<StudySessionRow, "id">;
      podcasts: TableOf<PodcastRow, "id" | "created_at">;
      annales: TableOf<AnnaleRow, "id" | "created_at">;
      annale_attempts: TableOf<AnnaleAttemptRow, "id" | "created_at">;
      levels: TableOf<LevelRow>;
      xp_rules: TableOf<XpRuleRow>;
      xp_events: TableOf<XpEventRow, "id" | "created_at">;
      achievements: TableOf<AchievementRow>;
      user_achievements: TableOf<UserAchievementRow, "unlocked_at">;
      subscriptions: TableOf<SubscriptionRow, "updated_at">;
      usage_counters: TableOf<UsageCounterRow>;
      ai_usage_log: TableOf<AiUsageLogRow, "id" | "created_at">;
      plan_limits: TableOf<PlanLimitRow>;
      kholle_credits: TableOf<KholleCreditRow, "granted_at">;
      kholle_usage: TableOf<KholleUsageRow>;
      kholle_sessions: TableOf<KholleSessionRow, "id" | "created_at">;
      kholle_criterion_scores: TableOf<KholleCriterionScoreRow, "comment">;
    };
    Views: Record<string, never>;
    Functions: {
      award_xp: {
        Args: {
          p_kind: string;
          p_scope: string;
          p_context?: Json;
          p_ref_table?: string | null;
          p_ref_id?: string | null;
        };
        Returns: {
          awarded: number;
          new_total: number;
          new_level: number;
          leveled_up: boolean;
        }[];
      };
      touch_streak: {
        Args: Record<string, never>;
        Returns: {
          streak_current: number;
          streak_best: number;
          xp_awarded: number;
        }[];
      };
      consume_quota: {
        Args: { p_kind: string; p_amount?: number };
        Returns: { allowed: boolean; used: number; limit_value: number }[];
      };
      consume_kholle: {
        Args: Record<string, never>;
        Returns: {
          allowed: boolean;
          remaining: number;
          resets_at: string;
          /** `offerte` = crédit de bienvenue, `plan` = allocation périodique. */
          source: KholleSource;
          /**
           * Faux pour l'essai gratuit : il ne se renouvelle pas, donc
           * `resets_at` ne doit jamais être montré à l'élève.
           */
          renews: boolean;
        }[];
      };
      /** Rend une khôlle quand la génération a échoué après le débit. */
      refund_kholle: {
        Args: { p_source: KholleSource };
        Returns: undefined;
      };
      kholle_balance: {
        Args: Record<string, never>;
        Returns: {
          credits: number;
          remaining: number;
          resets_at: string;
          renews: boolean;
        }[];
      };
      /** Dépense du mois imputable aux comptes gratuits, en dollars. */
      free_tier_spend_this_month: {
        Args: Record<string, never>;
        Returns: number;
      };
      level_from_xp: {
        Args: { p_xp: number };
        Returns: number;
      };
    };
    Enums: {
      lesson_source: LessonSource;
      lesson_status: LessonStatus;
      document_status: DocumentStatus;
      difficulty: Difficulty;
      message_role: MessageRole;
      session_type: SessionType;
      session_status: SessionStatus;
      podcast_status: PodcastStatus;
      plan_tier: PlanTier;
      subscription_status: SubscriptionStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
