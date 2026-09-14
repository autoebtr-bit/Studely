import { BrandLogo } from "@/components/brand/brand-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-cream-50">
      {/* Halos d'ambiance repris du hero, en plus discret. */}
      <div
        aria-hidden
        className="ambient-glow -top-32 left-1/2 h-[320px] w-[640px] max-w-[110vw] -translate-x-1/2 bg-gradient-to-r from-brand-200/50 via-blush-400/25 to-accent-200/50"
      />
      <div
        aria-hidden
        className="ambient-glow -bottom-24 right-0 size-72 bg-accent-200/40"
      />

      <header className="relative p-6">
        <BrandLogo size="md" />
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
