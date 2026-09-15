"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KHOLLES_OFFERTES } from "@/lib/billing/plans";
import { deleteAccount } from "./actions";

/** Ce que l'élève doit écrire pour confirmer. */
const CONFIRMATION = "SUPPRIMER";

/**
 * Suppression définitive du compte.
 *
 * Le bouton existait sans gestionnaire, alors que la politique de
 * confidentialité promet cette suppression — une obligation, pas une option.
 *
 * Deux précautions, parce que l'action est irréversible :
 *
 * 1. **Un mot à recopier**, pas une simple confirmation. Un clic de trop sur un
 *    bouton rouge efface deux ans de révisions ; écrire un mot suppose d'avoir
 *    lu ce qu'on fait.
 * 2. **On annonce que l'essai ne se rouvre pas.** C'est la seule conséquence
 *    vraiment contre-intuitive : tout le reste disparaît, sauf le fait d'avoir
 *    déjà bénéficié des khôlles offertes. Le découvrir après coup serait vécu
 *    comme une tromperie.
 */
export function DangerCard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);

    const result = await deleteAccount();

    if (!result.ok) {
      setError(result.error ?? "La suppression a échoué.");
      setBusy(false);
      return;
    }

    // Pas de `setBusy(false)` : le compte n'existe plus, la page va disparaître.
    router.push("/");
    router.refresh();
  }

  return (
    <Card className="mt-4 border-red-200 p-6">
      <h2 className="text-sm font-semibold text-red-700">Zone sensible</h2>
      <p className="mt-2 text-sm text-slate-600">
        La suppression du compte efface définitivement tes cours, tes fiches,
        tes khôlles et ta progression. Cette action est irréversible.
      </p>

      {!open ? (
        <Button
          className="mt-4"
          size="sm"
          variant="danger"
          onClick={() => setOpen(true)}
        >
          Supprimer mon compte
        </Button>
      ) : (
        <div className="mt-4 rounded-card border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">
            Tout sera effacé : tes cours importés, tes fiches, tes bilans de
            khôlle, ton planning et ton expérience.
          </p>
          <p className="mt-2 text-sm text-red-800">
            <strong>
              Tes {KHOLLES_OFFERTES} khôlles offertes ne seront pas rendues.
            </strong>{" "}
            L&apos;essai gratuit vaut une fois par personne : recréer un compte
            avec la même adresse ne le rouvrira pas.
          </p>

          <label
            htmlFor="confirmation"
            className="mt-4 block text-sm font-medium text-red-900"
          >
            Écris <span className="font-mono">{CONFIRMATION}</span> pour
            confirmer
          </label>
          <input
            id="confirmation"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            autoComplete="off"
            className="mt-1.5 h-10 w-full max-w-xs rounded-card border border-red-300 bg-white px-3 font-mono text-sm outline-none transition-colors focus:border-red-500"
          />

          {error && (
            <p
              role="alert"
              className="mt-3 flex items-start gap-2 text-sm text-red-700"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="danger"
              onClick={() => void confirm()}
              disabled={busy || saisie !== CONFIRMATION}
            >
              {busy && <Loader2 className="animate-spin" />}
              Supprimer définitivement
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setSaisie("");
                setError(null);
              }}
              disabled={busy}
            >
              Annuler
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
