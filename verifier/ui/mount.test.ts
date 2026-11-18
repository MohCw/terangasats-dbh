import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountVerifier } from "./mount";

let el: HTMLElement;
let fetchFn: ReturnType<typeof vi.fn>;
let unmount: () => void;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const flush = () => new Promise((r) => setTimeout(r, 0));
const fill = (text: string, sender: string) => {
  (el.querySelector("textarea") as HTMLTextAreaElement).value = text;
  (el.querySelector("input") as HTMLInputElement).value = sender;
};
const submit = () => (el.querySelector("form") as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true }));

beforeEach(() => {
  el = document.createElement("div");
  fetchFn = vi.fn();
  unmount = mountVerifier(el, { apiBase: "http://api", lang: "fr", fetchFn: fetchFn as unknown as typeof fetch });
});

describe("mountVerifier", () => {
  it("decides a fake SMS from an ordinary number on the phone, without a network call", () => {
    fill("Transfert reçu 25 000F", "771234567");
    submit();
    expect(el.textContent).toContain("Signes d’arnaque");
    expect(el.textContent).toContain("Ne remettez pas la marchandise.");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("offers the Wolof audio for the verdict", () => {
    fill("Transfert reçu 25 000F", "771234567");
    submit();
    expect(el.querySelector("audio")?.getAttribute("src")).toMatch(/arnaque.*\.mp3$/);
    expect(el.textContent).toContain("Écouter en wolof");
  });

  it("sends an ambiguous SMS masked and shows the server verdict with its advice", async () => {
    fetchFn.mockResolvedValue(json({ verdict: "aucun_signe", reasons: [], source: "ia" }));
    fill("Paiement reçu du 77 123 45 67", "OrangeMoney");
    submit();
    await flush();
    const body = JSON.parse(fetchFn.mock.calls[0][1].body);
    expect(fetchFn.mock.calls[0][0]).toBe("http://api/api/verify");
    expect(body.text).toContain("[NUMERO]");
    expect(body.text).not.toContain("77 123");
    expect(el.textContent).toContain("Aucun signe détecté");
    expect(el.textContent).toContain("Faites quand même confirmer par le vendeur. Seul son solde fait foi.");
  });

  it("shows À vérifier when the network fails", async () => {
    fetchFn.mockRejectedValue(new Error("offline"));
    fill("Paiement reçu", "OrangeMoney");
    submit();
    await flush();
    expect(el.textContent).toContain("À vérifier");
    expect(el.textContent).toContain("Vérification impossible, appelez le vendeur.");
  });

  it("explains a rate limit", async () => {
    fetchFn.mockResolvedValue(json({}, 429));
    fill("Paiement reçu", "OrangeMoney");
    submit();
    await flush();
    expect(el.textContent).toContain("Trop de demandes, réessayez dans une minute.");
  });

  it("asks for the SMS when the field is empty", () => {
    fill("", "");
    submit();
    expect(el.textContent).toContain("Collez le SMS reçu");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("never shows the word authentique", async () => {
    fetchFn.mockResolvedValue(json({ verdict: "aucun_signe", reasons: ["Message authentique"], source: "ia" }));
    fill("Paiement reçu", "OrangeMoney");
    submit();
    await flush();
    expect(el.innerHTML.toLowerCase()).not.toContain("authentique");
  });

  it("cleans up on unmount", () => {
    unmount();
    expect(el.innerHTML).toBe("");
  });
});
