import { describe, expect, it } from "vitest";
import { cleanEnv, numberEnv } from "@/lib/env";

/**
 * Lecture défensive des variables d'environnement.
 *
 * Ces quelques lignes sont couvertes parce que la même erreur a cassé deux
 * choses en production, le même jour, sur le même déploiement :
 *
 * 1. `new URL("")` a fait échouer le build entier ;
 * 2. `Number("")` vaut zéro, ce qui a mis le plafond de dépense de l'essai
 *    gratuit à 0 $ — le garde-fou censé arrêter les abus aurait fermé le
 *    service à tous les nouveaux inscrits.
 *
 * Dans les deux cas la cause était `??`, qui ne rattrape que `undefined` et
 * laisse passer une variable déclarée mais vide.
 */

describe("cleanEnv", () => {
  it("renvoie null pour ce qui ne porte rien", () => {
    expect(cleanEnv(undefined)).toBeNull();
    expect(cleanEnv("")).toBeNull();
    expect(cleanEnv("   ")).toBeNull();
    expect(cleanEnv("\n\t ")).toBeNull();
  });

  it("retire les espaces autour d'une valeur", () => {
    // Le copier-coller depuis un tableau de bord en ajoute régulièrement.
    expect(cleanEnv("  https://exemple.fr  ")).toBe("https://exemple.fr");
  });
});

describe("numberEnv", () => {
  it("lit un nombre valide", () => {
    expect(numberEnv("25", 500)).toBe(25);
    expect(numberEnv(" 25 ", 500)).toBe(25);
    expect(numberEnv("12.5", 500)).toBe(12.5);
  });

  it("retombe sur le défaut pour une variable vide", () => {
    // LE cas rencontré en production : la variable existait, sans valeur.
    // `Number("")` vaut 0, et un plafond à 0 bloque absolument tout le monde.
    expect(numberEnv("", 500)).toBe(500);
    expect(numberEnv("   ", 500)).toBe(500);
    expect(numberEnv(undefined, 500)).toBe(500);
  });

  it("retombe sur le défaut pour une valeur non numérique", () => {
    // `Number("25 $")` vaut NaN. Toute comparaison avec NaN étant fausse, un
    // plafond à NaN ne serait pas trop haut : il ne se déclencherait JAMAIS.
    // L'erreur inverse de la précédente, tout aussi silencieuse.
    expect(numberEnv("25 $", 500)).toBe(500);
    expect(numberEnv("vingt-cinq", 500)).toBe(500);
    expect(numberEnv("NaN", 500)).toBe(500);
    expect(numberEnv("Infinity", 500)).toBe(500);
  });

  it("refuse zéro et les valeurs négatives", () => {
    // Un plafond à zéro n'a aucun usage légitime : c'est toujours un accident.
    // Le vrai moyen de fermer l'essai est de mettre les quotas du plan à zéro.
    expect(numberEnv("0", 500)).toBe(500);
    expect(numberEnv("-10", 500)).toBe(500);
  });
});
