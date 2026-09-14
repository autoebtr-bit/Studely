"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MODULES, searchModules } from "@/lib/modules/registry";
import { gradientClass } from "@/lib/modules/gradients";
import { cn } from "@/lib/utils/cn";

/** Chapitre consultable depuis la recherche. */
export interface SearchableChapter {
  id: string;
  title: string;
  subjectName: string;
  emoji: string;
  progressPct: number;
}

/**
 * Les chapitres sont passés en propriété : ce composant est client, il ne peut
 * pas lire la base lui-même. Sur un compte neuf la liste est vide, et seules
 * les fonctionnalités restent trouvables.
 */
export function SearchPanel({
  chapters = [],
}: {
  chapters?: SearchableChapter[];
}) {
  const [query, setQuery] = useState("");

  const moduleHits = useMemo(
    () => (query ? searchModules(query) : MODULES.slice(0, 6)),
    [query],
  );

  const chapterHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return chapters.filter((c) =>
      `${c.title} ${c.subjectName}`.toLowerCase().includes(q),
    );
  }, [query, chapters]);

  const empty = query && moduleHits.length === 0 && chapterHits.length === 0;

  return (
    <>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un module, une matière, un chapitre…"
          aria-label="Rechercher"
          autoFocus
          className="h-12 w-full rounded-pill border border-cream-300 bg-white pl-11 pr-4 text-sm outline-none transition-colors focus:border-brand-400"
        />
      </div>

      {empty && (
        <Card className="mt-5 p-8 text-center">
          <p className="text-sm text-slate-600">
            Aucun résultat pour « {query} ».
          </p>
        </Card>
      )}

      {chapterHits.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Chapitres
          </h2>
          <div className="space-y-2">
            {chapterHits.map((chapter) => (
              <Link key={chapter.id} href={`/cours/${chapter.id}`}>
                <Card className="flex items-center gap-3 p-3.5 transition-colors hover:border-brand-200">
                  <span className="text-lg" aria-hidden>
                    {chapter.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {chapter.title}
                    </p>
                    <p className="text-xs text-slate-500">{chapter.subjectName}</p>
                  </div>
                  <Badge variant="neutral">{chapter.progressPct}%</Badge>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {moduleHits.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {query ? "Modules" : "Modules populaires"}
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {moduleHits.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link key={mod.slug} href={`/${mod.slug}`}>
                  <Card
                    className={cn(
                      "flex items-center gap-3 p-3.5 transition-colors hover:border-brand-200",
                      mod.status === "soon" && "opacity-70",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-tile bg-gradient-to-br text-white",
                        gradientClass(mod.gradient),
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {mod.title}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {mod.subtitle}
                      </p>
                    </div>
                    {mod.status === "soon" && <Badge variant="neutral">Bientôt</Badge>}
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
