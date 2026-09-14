import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { BRAND, FOOTER_COLUMNS } from "@/lib/marketing/content";

export function SiteFooter() {
  return (
    <footer className="border-t border-cream-200/80 bg-white pb-12 pt-16 text-sm text-slate-600">
      <div className="section-shell">
        <div className="grid grid-cols-2 gap-10 border-b border-cream-100 pb-12 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <BrandLogo size="sm" className="mb-4" />
            <p className="max-w-xs text-xs leading-relaxed text-slate-500">
              {BRAND.tagline}
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-900">
                {column.title}
              </h2>
              <ul className="space-y-2.5 text-xs font-medium">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="transition-colors hover:text-brand-600"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 pt-8 text-xs text-slate-500 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {BRAND.name} SAS. Tous droits réservés.
          </p>
          <p className="flex items-center gap-1 font-medium">
            {BRAND.madeIn} <span className="text-brand-500">❤️</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
