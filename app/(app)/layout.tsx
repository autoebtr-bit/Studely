import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ChronoFab } from "@/components/layout/chrono-fab";
import { readProfile } from "@/lib/data/profile";
import { readDueFlashcardCount } from "@/lib/data/courses";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Shell de l'application connectée.
 *
 * L'élève vient de sa session Supabase. Le middleware garantit qu'on n'atteint
 * jamais ce layout sans être authentifié ; la redirection ci-dessous couvre le
 * cas résiduel d'un jeton expiré entre le middleware et le rendu.
 *
 * Tant que la base n'est pas configurée, on laisse passer sans profil : c'est
 * le mode démonstration, qui permet de parcourir l'interface sans compte.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const configured = isSupabaseConfigured();
  const profile = configured ? await readProfile() : null;

  if (configured && !profile) redirect("/login");

  const user = {
    fullName: profile?.fullName ?? "Invité",
    xpTotal: profile?.xpTotal ?? 0,
    streakCurrent: profile?.streakCurrent ?? 0,
  };

  const counters = {
    dueFlashcards: configured ? await readDueFlashcardCount() : 0,
  };

  return (
    <div className="flex min-h-screen bg-cream-50">
      <Sidebar
        user={user}
        counters={counters}
        className="sticky top-0 hidden h-screen lg:flex"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} counters={counters} />
        <main className="flex-1 px-4 pb-24 pt-6 lg:px-8">{children}</main>
      </div>

      <ChronoFab />
    </div>
  );
}
