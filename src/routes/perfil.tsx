import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Star, Type } from "lucide-react";
import { Shell } from "@/components/Shell";
import { LESSONS, speak, useProgress } from "@/lib/app";
import aluna from "@/assets/aluna.jpg";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "ABC — Meu Perfil" },
      { name: "description", content: "Veja suas estrelas e seu progresso na leitura." },
      { property: "og:title", content: "ABC — Meu Perfil" },
      { property: "og:description", content: "Conquistas e progresso do aluno." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Perfil,
});

function Perfil() {
  const { done } = useProgress();
  const [big, setBig] = useState(false);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);

  // Read the saved preference before allowing this screen to write anything.
  // This prevents the default false state from overwriting a saved true value
  // whenever the user returns to the Profile screen.
  useEffect(() => {
    try {
      setBig(window.localStorage.getItem("beaba-large-text") === "true");
    } catch {
      setBig(false);
    } finally {
      setPreferenceLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!preferenceLoaded) return;

    try {
      window.localStorage.setItem("beaba-large-text", String(big));
    } catch {
      // The current session still gets the selected text size if storage is unavailable.
    }
    document.documentElement.style.fontSize = big ? "24px" : "";
  }, [big, preferenceLoaded]);
  const pct = Math.round((done.length / LESSONS.length) * 100);

  return (
    <Shell home>
      <section className="person-heading flex min-w-0 flex-col items-center gap-3" data-speak={`Maria. Você tem ${done.length} estrelas de ${LESSONS.length}.`}>
        <img src={aluna} alt="Foto de Maria" width={816} height={816} className="h-44 w-44 rounded-full border-4 border-[var(--home-header)] object-cover shadow-[0_8px_20px_rgb(0_0_0/0.12)]" />
        <h1 className="text-4xl font-extrabold text-[var(--home-navy)]">Maria</h1>
      </section>

      <div className="mt-8 flex items-center justify-center gap-3" aria-label={`${done.length} de ${LESSONS.length} tarefas concluídas`}>
        <Star className="h-14 w-14 shrink-0 fill-[var(--b-yellow)] text-[var(--b-yellow-d)]" strokeWidth={2.5} />
        <span className="font-display text-3xl font-extrabold tabular-nums text-[var(--home-navy)]">
          {done.length}/{LESSONS.length}
        </span>
      </div>

      <div className="mt-5 h-10 overflow-hidden rounded-full bg-[var(--home-tag)]" role="progressbar" aria-label="Progresso das tarefas" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-[var(--b-blue)] transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="profile-settings mt-10 grid min-w-0 grid-cols-1 gap-4">
        <button
          onClick={() => { setBig(!big); speak(big ? "Letra normal" : "Letra grande"); }}
          aria-pressed={big}
          aria-label="Letra grande"
          className={`flex flex-col items-center gap-2 rounded-[2rem] p-5 font-display text-xl font-bold shadow-[0_10px_22px_rgb(0_0_0/0.10)] active:scale-[0.97] ${big ? "bg-[var(--b-green)] text-[#FFFFFF]" : "bg-[var(--home-nav)] text-[var(--home-navy)]"}`}
        >
          <Type className="h-12 w-12" strokeWidth={2.5} /> A+
        </button>

      </div>
    </Shell>
  );
}
