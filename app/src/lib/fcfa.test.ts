import { describe, it, expect } from "vitest";
import { parseFcfa, fcfaToSats } from "./fcfa";

describe("fcfa", () => {
  it("convertit en sats", () => expect(fcfaToSats(16500, 90000)).toBe(27949));
  it("accepte les séparateurs usuels", () => {
    expect(parseFcfa("16 500")).toBe(16500);
    expect(parseFcfa("10.000")).toBe(10000);
    expect(parseFcfa("2500F")).toBe(2500);
    expect(parseFcfa("2 500 FCFA")).toBe(2500);
  });
  it("rejette les montants invalides", () => {
    for (const bad of ["0", "-5", "12,5", "abc", "", "5000001"])
      expect(() => parseFcfa(bad)).toThrow("Montant invalide");
  });
});
