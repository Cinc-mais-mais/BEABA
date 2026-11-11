import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Star } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Activity } from "@/components/Activity";
import { LESSONS, speak, useProgress, type Lesson } from "@/lib/app";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Beabá" },
      { name: "description", content: "Trilha de atividades para aprender a ler, feita para idosos." },
      { property: "og:title", content: "Beabá — Trilha de atividades" },
      { property: "og:description", content: "Aprenda a ler no seu ritmo, com sons e figuras." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const bubble = { red: "red", yellow: "yellow", blue: "blue", orange: "orange" } as const;
const offsets = ["self-start ml-6", "self-end mr-6", "self-center", "self-start ml-[70px]"];

function Index() {
  const { done, complete } = useProgress();
  const [open, setOpen] = useState<Lesson | null>(null);

  return (
    <Shell home>
      <h1 className="sr-only">Trilha de atividades</h1>
      <div data-speak="Toque em um balão para começar uma atividade." className="sr-only" aria-hidden />
      <ol className="relative flex flex-col gap-10">
        <svg className="pointer-events-none absolute inset-0 -z-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
          <path d="M20 5 C 90 15, 90 30, 80 35 S 10 55, 50 65 S 15 85, 25 95" fill="none" stroke="var(--home-dot)" strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 7, strokeDasharray: "0 20" }} />
        </svg>
        {LESSONS.map((l, idx) => {
          const isDone = done.includes(l.id);
          return (
            <li key={l.id} className={`relative z-10 flex flex-col items-center ${offsets[idx % 4]}`}>
              <button
                onClick={() => { speak(l.title); setOpen(l); }}
                aria-label={`${l.title}${isDone ? ", concluída" : ""}`}
                className="home-bubble balloon-shine animate-float flex h-[130px] w-[130px] items-center justify-center rounded-full font-display text-5xl font-extrabold text-[#FFFFFF]"
                style={{ animationDelay: `${idx * 0.4}s`, ["--b" as string]: `var(--b-${isDone ? "green" : bubble[l.color]})`, ["--bd" as string]: `var(--b-${isDone ? "green" : bubble[l.color]}-d)` }}
              >
                {l.icon}
                {isDone && (
                  <Star className="absolute -right-2 -top-2 h-12 w-12 fill-yellow text-yellow" strokeWidth={2} />
                )}
              </button>
              <span className="mt-5 rounded-full bg-[var(--home-tag)] px-4 py-1 font-display text-xl font-bold text-[var(--home-navy)]">{l.title}</span>
            </li>
          );
        })}
      </ol>
      {open && <Activity lesson={open} onClose={() => setOpen(null)} onDone={() => complete(open.id)} />}
    </Shell>
  );
}
