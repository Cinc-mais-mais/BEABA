import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Type } from "lucide-react";
import { Shell } from "@/components/Shell";
import { speak } from "@/lib/app";
import aluna from "@/assets/aluna.jpg";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Beabá" },
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

  return (
    <Shell home>
      <section className="person-heading flex min-w-0 flex-col items-center gap-3" data-speak="Maria. Bem-vinda ao seu perfil.">
        <img src={aluna} alt="Foto de Maria" width={816} height={816} className="h-44 w-44 rounded-full border-4 border-[var(--home-header)] object-cover shadow-[0_8px_20px_rgb(0_0_0/0.12)]" />
        <h1 className="text-4xl font-extrabold text-[var(--home-navy)]">Maria</h1>
      </section>

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
