import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
const offsets = ["self-start ml-6", "self-end mr-6", "self-center", "self-start ml-[51%] translate-y-8", "self-start ml-[60%] translate-y-8"];

function Index() {
  const { done, complete } = useProgress();
  const [open, setOpen] = useState<Lesson | null>(null);
  const [trail, setTrail] = useState({ width: 0, height: 0, path: "" });
  const listRef = useRef<HTMLOListElement | null>(null);
  const bubbleRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const updateTrail = () => {
      const listRect = list.getBoundingClientRect();
      const points = bubbleRefs.current
        .slice(0, LESSONS.length)
        .map((bubble) => {
          if (!bubble) return null;
          const rect = bubble.getBoundingClientRect();
          return {
            x: rect.left + rect.width / 2 - listRect.left,
            y: rect.top + rect.height / 2 - listRect.top,
          };
        })
        .filter((point): point is { x: number; y: number } => point !== null);

      if (points.length < 2) {
        setTrail({ width: listRect.width, height: listRect.height, path: "" });
        return;
      }

      let path = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        const previous = points[i - 1];
        const current = points[i];
        const middleY = (previous.y + current.y) / 2;
        path += ` C ${previous.x} ${middleY}, ${current.x} ${middleY}, ${current.x} ${current.y}`;
      }

      setTrail({ width: listRect.width, height: listRect.height, path });
    };

    updateTrail();
    const observer = new ResizeObserver(updateTrail);
    observer.observe(list);
    bubbleRefs.current.forEach((bubble) => {
      if (bubble) observer.observe(bubble);
    });
    window.addEventListener("resize", updateTrail);
    window.addEventListener("load", updateTrail);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateTrail);
      window.removeEventListener("load", updateTrail);
    };
  }, []);

  return (
    <Shell home>
      <h1 className="sr-only">Trilha de atividades</h1>
      <div data-speak="Toque em um balão para começar uma atividade." className="sr-only" aria-hidden />
      <ol ref={listRef} className="relative flex flex-col gap-10">
        <svg
          className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
          viewBox={`0 0 ${trail.width || 1} ${trail.height || 1}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d={trail.path}
            fill="none"
            stroke="var(--home-dot)"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            style={{ strokeWidth: 7, strokeDasharray: "0 20" }}
          />
        </svg>
        {LESSONS.map((l, idx) => {
          const isDone = done.includes(l.id);
          return (
            <li key={l.id} className={`relative z-10 flex flex-col items-center ${offsets[idx] ?? "self-center"}`}>
              <button
                ref={(element) => { bubbleRefs.current[idx] = element; }}
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
