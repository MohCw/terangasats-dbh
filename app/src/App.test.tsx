import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/preact";

vi.mock("./screens/VerifierHost", () => ({ VerifierHost: () => <div>faux vérificateur</div> }));

import { App } from "./App";

async function go(hash: string) {
  location.hash = hash;
  render(<App />);
  await act(async () => {});
}

describe("App", () => {
  beforeEach(() => { document.body.replaceChildren(); localStorage.setItem("ts-demo", "1"); });

  it("accueil", async () => {
    await go("#/");
    expect(screen.getByText("Je suis vendeur")).toBeTruthy();
    expect(screen.getByText("J’ai reçu un SMS")).toBeTruthy();
    expect(screen.getByText("Français")).toBeTruthy();
  });
  it("vendeur (démo)", async () => {
    await go("#/vendeur");
    expect(await screen.findByText("Nouvelle commande")).toBeTruthy();
  });
  it("livraison avec lien abîmé", async () => {
    await go("#/livraison?d=abime");
    expect(screen.getByText("Lien invalide. Demandez un nouveau lien au vendeur.")).toBeTruthy();
  });
  it("reçu invalide", async () => {
    await go("#/recu?e=x&o=y");
    expect(await screen.findByText("Reçu invalide")).toBeTruthy();
  });
  it("vérificateur", async () => {
    await go("#/verifier");
    expect(screen.getByText("faux vérificateur")).toBeTruthy();
  });
});
