import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mic, Video, HelpCircle, Square } from "lucide-react";
import { Shell } from "@/components/Shell";
import { chime, speak } from "@/lib/app";
import professora from "@/assets/professora.jpg";

export const Route = createFileRoute("/professor")({
  head: () => ({
    meta: [
      { title: "Beabá" },
      { name: "description", content: "Fale com sua professora por áudio, vídeo ou envie uma dúvida." },
      { property: "og:title", content: "ABC — Área do Professor" },
      { property: "og:description", content: "Contato simples e visual com a professora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Professor,
});

function Professor() {
  const [recording, setRecording] = useState<string | null>(null);

  const actions = [
    { id: "audio", label: "Mensagem", icon: Mic, color: "bg-[var(--b-red)]", say: "Mandar mensagem de áudio" },
    { id: "video", label: "Vídeo", icon: Video, color: "bg-[var(--b-blue)]", say: "Ligar por vídeo" },
    { id: "duvida", label: "Dúvida", icon: HelpCircle, color: "bg-[var(--b-orange)]", say: "Perguntar uma dúvida por voz" },
  ];

  const press = (a: (typeof actions)[number]) => {
    if (recording === a.id) {
      setRecording(null);
      chime("ok");
      speak("Pronto! A professora Ana vai receber.");
      return;
    }
    setRecording(a.id);
    speak(a.id === "video" ? "Chamando a professora Ana." : `${a.say}. Fale agora. Toque de novo para enviar.`);
  };

  return (
    <Shell home>
      <section className="person-heading flex min-w-0 flex-col items-center gap-4" data-speak="Professora Ana. Toque em um botão para falar com ela.">
        <img src={professora} alt="Professora Ana" width={816} height={816} className="h-48 w-48 rounded-full border-4 border-[var(--home-header)] object-cover shadow-[0_8px_20px_rgb(0_0_0/0.12)]" />
        <h1 className="text-4xl font-extrabold text-[var(--home-navy)]">Professora Ana</h1>
        <span className="flex items-center gap-2 text-lg font-bold text-[var(--home-navy)]">
          <span className="h-4 w-4 rounded-full bg-success" aria-hidden /> Online
        </span>
      </section>

      <div className="teacher-actions mt-8 grid min-w-0 gap-5">
        {actions.map((a) => {
          const active = recording === a.id;
          return (
            <button
              key={a.id}
              onClick={() => press(a)}
              aria-label={active ? "Enviar" : a.say}
              className={`flex items-center gap-5 rounded-[2rem] p-5 text-left text-[#FFFFFF] shadow-[0_10px_22px_rgb(0_0_0/0.12)] transition-transform active:scale-[0.97] ${active ? "bg-[var(--b-green)]" : a.color}`}
            >
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#FFFFFF]/90 text-[var(--home-navy)]">
                {active ? <Square className="h-10 w-10 animate-pulse fill-red text-red" /> : <a.icon className="h-11 w-11" strokeWidth={2.5} />}
              </span>
              <span className="font-display text-3xl font-extrabold">{active ? (a.id === "video" ? "Chamando…" : "Enviar") : a.label}</span>
            </button>
          );
        })}
      </div>
    </Shell>
  );
}
