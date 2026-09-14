/**
 * Détection de la configuration Supabase.
 *
 * Tant que le projet Supabase n'est pas configuré, l'application s'ouvre sans
 * session et tous les écrans s'affichent vides. Sans cette bascule explicite,
 * le middleware lèverait une exception sur CHAQUE route et l'application
 * entière deviendrait inaccessible — un échec bien pire que l'absence d'auth.
 *
 * Les deux variables sont publiques (préfixe NEXT_PUBLIC_), donc lisibles
 * côté client comme côté serveur.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && url.startsWith("http"));
}

/** Message affiché à l'utilisateur quand la configuration manque. */
export const SUPABASE_SETUP_HINT =
  "Supabase n'est pas encore configuré. Renseigne NEXT_PUBLIC_SUPABASE_URL et " +
  "NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local (voir .env.example).";
