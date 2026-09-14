import { cn } from "@/lib/utils/cn";

interface Avatar {
  emoji: string;
  className: string;
}

interface FloatingCalloutProps {
  text: string;
  avatars: readonly Avatar[];
  /** Côté du hero : oriente le trait de liaison et l'ordre des blocs. */
  side: "left" | "right";
  className?: string;
}

/**
 * Bulle de commentaire flottante du hero : une carte en verre, un trait tracé
 * à la main vers la maquette, et une grappe de pastilles.
 *
 * Le trait est un SVG et non une image : il suit la couleur du thème et reste
 * net à tous les zooms.
 */
export function FloatingCallout({
  text,
  avatars,
  side,
  className,
}: FloatingCalloutProps) {
  const isLeft = side === "left";

  const avatarCluster = (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border border-cream-200 bg-white/90 px-2.5 py-1 shadow-sm",
        isLeft ? "ml-8" : "mr-6 mb-1",
      )}
    >
      {avatars.map((avatar, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            "grid size-5 place-items-center rounded-full text-[10px]",
            avatar.className,
          )}
        >
          {avatar.emoji}
        </span>
      ))}
    </div>
  );

  const bubble = (
    <p className="glass-card max-w-[210px] rounded-2xl px-4 py-2.5 text-left text-xs font-semibold text-slate-800">
      {text}
    </p>
  );

  const connector = (
    <svg
      viewBox="0 0 100 60"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      aria-hidden
      className={cn("h-16 w-24 text-slate-400/80", isLeft ? "-mt-1 ml-12" : "mr-10")}
    >
      <path d={isLeft ? "M 15 5 C 15 35, 75 20, 75 55" : "M 85 5 C 85 30, 20 25, 20 55"} />
    </svg>
  );

  return (
    <div
      className={cn(
        "hidden sm:block",
        isLeft ? "animate-float-slow text-left" : "animate-float-reverse text-right",
        className,
      )}
    >
      {isLeft ? (
        <>
          {bubble}
          {connector}
          {avatarCluster}
        </>
      ) : (
        <>
          {avatarCluster}
          {connector}
          {bubble}
        </>
      )}
    </div>
  );
}
