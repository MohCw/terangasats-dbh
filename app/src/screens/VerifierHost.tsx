import { useEffect, useRef } from "preact/hooks";
import type { Lang } from "../i18n";
import { Brand } from "../components/Brand";

export function VerifierHost({ lang = "fr" }: { lang?: Lang }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let unmount: (() => void) | undefined;
    let cancelled = false;
    import("../../../verifier/ui/mount").then(({ mountVerifier }) => {
      if (cancelled || !ref.current) return;
      unmount = mountVerifier(ref.current, {
        apiBase: import.meta.env.VITE_VERIFIER_URL ?? "http://localhost:8787",
        lang,
      });
    });
    return () => { cancelled = true; unmount?.(); };
  }, [lang]);
  return (
    <main className="screen screen--wide">
      <Brand />
      <div ref={ref} />
    </main>
  );
}
