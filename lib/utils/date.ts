/** Nombre de jours entiers restants avant une date ISO (`YYYY-MM-DD`). */
export function daysUntil(isoDate: string, from: Date = new Date()): number {
  const target = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(target.getTime())) return 0;

  // Comparaison au jour près : on neutralise l'heure des deux côtés.
  const startOfToday = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate(),
  );
  const diffMs = target.getTime() - startOfToday.getTime();
  return Math.max(0, Math.round(diffMs / 86_400_000));
}

/** Date longue en français, ex. « 15 juin 2026 ». */
export function formatDateLong(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
