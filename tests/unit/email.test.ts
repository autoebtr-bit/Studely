import { describe, expect, it } from "vitest";
import {
  DISPOSABLE_DOMAINS,
  canonicalEmail,
  isDisposableDomain,
} from "@/lib/auth/email";

describe("identité canonique d'une adresse", () => {
  it("ignore la casse et les espaces", () => {
    expect(canonicalEmail("  Victor@Example.FR ")).toBe("victor@example.fr");
  });

  it("assimile les étiquettes « + » chez les fournisseurs qui les servent", () => {
    expect(canonicalEmail("victor+studely@gmail.com")).toBe("victor@gmail.com");
    expect(canonicalEmail("victor+1@outlook.fr")).toBe("victor@outlook.fr");
    expect(canonicalEmail("victor+x@proton.me")).toBe("victor@proton.me");
  });

  it("ignore les points du nom, mais chez Google seulement", () => {
    expect(canonicalEmail("v.i.c.t.o.r@gmail.com")).toBe("victor@gmail.com");
    // Ailleurs, un point peut distinguer deux personnes réelles.
    expect(canonicalEmail("jean.dupont@laposte.net")).toBe(
      "jean.dupont@laposte.net",
    );
  });

  it("ramène googlemail.com à gmail.com", () => {
    expect(canonicalEmail("victor@googlemail.com")).toBe("victor@gmail.com");
    expect(canonicalEmail("vic.tor+a@googlemail.com")).toBe("victor@gmail.com");
  });

  it("ne fusionne rien chez un fournisseur inconnu", () => {
    // Prudence délibérée : refuser l'essai à un vrai élève coûte bien plus cher
    // que d'en laisser passer un malin.
    expect(canonicalEmail("a+b@mon-lycee.fr")).toBe("a+b@mon-lycee.fr");
    expect(canonicalEmail("a.b@mon-lycee.fr")).toBe("a.b@mon-lycee.fr");
  });

  it("assimile toutes les variantes d'une même boîte Google", () => {
    const formes = [
      "victor@gmail.com",
      "Victor@Gmail.com",
      "v.ictor@gmail.com",
      "victor+prepa@gmail.com",
      "V.I.C.T.O.R+x@googlemail.com",
    ];
    const canoniques = new Set(formes.map((f) => canonicalEmail(f)));
    expect(canoniques.size, [...canoniques].join(" / ")).toBe(1);
  });

  it("rejette ce qui n'est pas une adresse exploitable", () => {
    for (const invalide of ["", "victor", "@gmail.com", "victor@", "a@b", "+x@gmail.com"]) {
      expect(canonicalEmail(invalide), invalide).toBeNull();
    }
  });

  it("retient le dernier « @ » d'une adresse qui en contient plusieurs", () => {
    expect(canonicalEmail('"a@b"@example.fr')).toBe('"a@b"@example.fr');
  });
});

describe("domaines jetables", () => {
  it("reconnaît les services connus", () => {
    expect(isDisposableDomain("truc@yopmail.com")).toBe(true);
    expect(isDisposableDomain("TRUC+1@Mailinator.com")).toBe(true);
  });

  it("laisse passer une adresse ordinaire", () => {
    expect(isDisposableDomain("victor@gmail.com")).toBe(false);
    expect(isDisposableDomain("eleve@lycee-chaptal.fr")).toBe(false);
  });

  it("ne bloque pas sur une adresse invalide", () => {
    // La validation de forme est un autre sujet : ici on répond juste « non ».
    expect(isDisposableDomain("n'importe quoi")).toBe(false);
  });

  it("garde une liste sans doublon ni majuscule", () => {
    expect(new Set(DISPOSABLE_DOMAINS).size).toBe(DISPOSABLE_DOMAINS.length);
    for (const d of DISPOSABLE_DOMAINS) {
      expect(d, d).toBe(d.toLowerCase());
    }
  });
});
