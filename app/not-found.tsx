import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-cream-50 px-6">
      <div className="text-center">
        <p className="text-6xl font-bold tracking-tight text-brand-600">404</p>
        <h1 className="mt-3 text-xl font-semibold text-slate-900">
          Cette page n&apos;existe pas
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
          Le lien est peut-être obsolète, ou le module que tu cherches n&apos;a pas
          encore vu le jour.
        </p>
        <Link href="/dashboard" className="mt-6 inline-block">
          <Button>Retour au tableau de bord</Button>
        </Link>
      </div>
    </div>
  );
}
