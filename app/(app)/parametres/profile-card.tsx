"use client";

import { useState } from "react";
import { AlertCircle, Check, Loader2, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateLong } from "@/lib/utils/date";
import { updateProfile } from "./actions";

const NIVEAUX = [
  "Seconde",
  "Première",
  "Terminale",
  "Prépa",
  "Licence",
  "Master",
  "Autre",
] as const;

interface ProfileCardProps {
  fullName: string;
  email: string;
  studyLevel: string | null;
  examDate: string | null;
}

/**
 * Profil de l'élève, consultable puis modifiable.
 *
 * Le bouton « Modifier mon profil » n'avait aucun gestionnaire. Le niveau et la
 * date de concours n'étaient renseignables qu'au questionnaire d'accueil, donc
 * une date de concours erronée s'y trouvait piégée — alors que c'est elle qui
 * construit tout le planning.
 *
 * L'adresse e-mail n'est pas modifiable ici : la changer suppose de confirmer
 * la nouvelle avant d'abandonner l'ancienne, faute de quoi une faute de frappe
 * ferme le compte définitivement. Ça mérite son propre parcours.
 */
export function ProfileCard({
  fullName,
  email,
  studyLevel,
  examDate,
}: ProfileCardProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nom, setNom] = useState(fullName);
  const [niveau, setNiveau] = useState(studyLevel ?? "");
  const [date, setDate] = useState(examDate ?? "");

  async function save() {
    setSaving(true);
    setError(null);

    const result = await updateProfile({
      fullName: nom.trim(),
      studyLevel: niveau,
      examDate: date,
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.error ?? "L'enregistrement a échoué.");
      return;
    }

    setEditing(false);
    setSaved(true);
  }

  function cancel() {
    // Revenir aux valeurs enregistrées : sans cela, rouvrir le formulaire
    // rejouerait une saisie abandonnée.
    setNom(fullName);
    setNiveau(studyLevel ?? "");
    setDate(examDate ?? "");
    setError(null);
    setEditing(false);
  }

  if (!editing) {
    return (
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-slate-900">Profil</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Nom complet" value={fullName || "—"} />
          <Field label="Adresse e-mail" value={email || "—"} />
          <Field label="Niveau d'études" value={studyLevel ?? "Non renseigné"} />
          <Field
            label="Date d'examen"
            value={examDate ? formatDateLong(examDate) : "Non renseignée"}
          />
        </div>

        {saved && (
          <p className="mt-4 flex items-start gap-2 text-sm text-emerald-700">
            <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
            Profil enregistré.
          </p>
        )}

        <Button
          className="mt-5"
          size="sm"
          variant="outline"
          onClick={() => {
            setSaved(false);
            setEditing(true);
          }}
        >
          <Pencil />
          Modifier mon profil
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-slate-900">Profil</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="block text-xs font-medium text-slate-500">
            Nom complet
          </span>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            maxLength={80}
            className="mt-1 h-10 w-full rounded-card border border-cream-300 px-3 text-sm outline-none transition-colors focus:border-brand-400"
          />
        </label>

        <div className="text-sm">
          <span className="block text-xs font-medium text-slate-500">
            Adresse e-mail
          </span>
          <p className="mt-1 flex h-10 items-center text-sm text-slate-500">
            {email}
          </p>
        </div>

        <label className="text-sm">
          <span className="block text-xs font-medium text-slate-500">
            Niveau d&apos;études
          </span>
          <select
            value={niveau}
            onChange={(e) => setNiveau(e.target.value)}
            className="mt-1 h-10 w-full rounded-card border border-cream-300 bg-white px-3 text-sm outline-none transition-colors focus:border-brand-400"
          >
            <option value="">Non renseigné</option>
            {NIVEAUX.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="block text-xs font-medium text-slate-500">
            Date d&apos;examen
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 h-10 w-full rounded-card border border-cream-300 px-3 text-sm outline-none transition-colors focus:border-brand-400"
          />
        </label>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        La date d&apos;examen sert à construire ton planning à rebours. La
        changer ne modifie pas le planning déjà généré — regénère-le depuis
        l&apos;écran Planning.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 text-sm text-red-600"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => void save()} disabled={saving || !nom.trim()}>
          {saving && <Loader2 className="animate-spin" />}
          Enregistrer
        </Button>
        <Button size="sm" variant="ghost" onClick={cancel} disabled={saving}>
          Annuler
        </Button>
      </div>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm text-slate-900">{value}</p>
    </div>
  );
}
