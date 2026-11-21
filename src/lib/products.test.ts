import { describe, it, expect } from "vitest";
import { buyLabel, validateProduct } from "./products";
import { ussdCode, ussdLink } from "./config";

describe("règles boutique", () => {
  it("bouton selon le type", () => {
    expect(buyLabel("fichier")).toBe("Télécharger");
    expect(buyLabel("formation")).toBe("Prendre la formation");
    expect(buyLabel("coaching")).toBe("Réserver");
    expect(buyLabel("service")).toBe("Réserver");
  });
  it("code Airtel avec le montant", () => {
    expect(ussdCode(15000)).toBe("*436*6*1*15000#");
    expect(ussdLink(5000)).toBe("tel:*436*6*1*5000%23");
  });
  it("même politique de publication pour tous les types", () => {
    for (const type of ["fichier", "formation", "coaching", "service"] as const) {
      expect(validateProduct({ type }, {}).length).toBe(7);
    }
  });
});
