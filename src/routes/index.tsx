import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Star, Lock, CheckCircle2 } from "lucide-react";
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
const offsets = ["self-start ml-6", "self-end mr-6", "self-center", "self-start ml-[51%] translate-y-8", "self-start ml-6"];

function Index() {
  const { done, complete } = useProgress();
  const [open, setOpen] = useState<Lesson | null>(null);
  const completedCount = done.length;
  const progressPct = LESSONS.length ? Math.round((completedCount / LESSONS.length) * 100) : 0;
  const nextLessonIndex = LESSONS.findIndex((lesson) => !done.includes(lesson.id));
  const nextLesson = nextLessonIndex >= 0 ? LESSONS[nextLessonIndex] : null;
  const encouragement = completedCount === 0
    ? "Vamos começar? Cada atividade é um passo importante!"
    : completedCount >= LESSONS.length
      ? "Parabéns! Você completou toda a trilha. Que conquista!"
      : completedCount === LESSONS.length - 1
        ? "Está quase lá! Falta só mais uma atividade!"
        : "Muito bem! Continue assim, você está aprendendo cada vez mais!";
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
      <section className="mb-8 w-full rounded-[2rem] bg-[var(--home-nav)] p-5 shadow-[0_8px_20px_rgb(0_0_0/0.07)]"><div className="flex items-center justify-between gap-3"><div><p className="font-display text-lg font-extrabold text-[var(--home-navy)]">Sua jornada</p><p className="font-display text-sm font-bold text-[var(--home-navy)]">{completedCount} de {LESSONS.length} atividades concluídas</p></div><span className="font-display text-2xl font-extrabold tabular-nums text-[var(--home-navy)]">{progressPct}%</span></div><div className="mt-3 h-4 overflow-hidden rounded-full bg-[var(--home-tag)]" role="progressbar" aria-label="Progresso da trilha" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-[var(--b-blue)] transition-all duration-500" style={{ width: `${progressPct}%` }} /></div><p className="mt-3 text-center font-display text-sm font-bold text-[var(--home-navy)]" aria-live="polite">{encouragement}</p>{nextLesson && <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/75 p-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-extrabold text-white" style={{ backgroundColor: "var(--b-green)" }}>{nextLesson.icon}</span><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-wide text-[var(--home-navy)]">Próxima atividade</p><p className="font-display font-extrabold text-[var(--home-navy)]">{nextLesson.title}</p></div><CheckCircle2 className="h-6 w-6 shrink-0 text-[var(--b-green)]" /></div>}</section>
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
          const isLocked = !isDone && nextLessonIndex >= 0 && idx > nextLessonIndex;
          return (
            <li key={l.id} className={`relative z-10 flex flex-col items-center ${offsets[idx] ?? "self-center"}`}>
              <button
                ref={(element) => { bubbleRefs.current[idx] = element; }}
                onClick={() => { if (!isLocked) { speak(l.title); setOpen(l); } }}
                disabled={isLocked}
                aria-label={`${l.title}${isDone ? ", concluída" : isLocked ? ", bloqueada" : ", disponível"}`}
                className={`home-bubble balloon-shine flex h-[130px] w-[130px] items-center justify-center rounded-full font-display text-5xl font-extrabold text-[#FFFFFF] ${isLocked ? "cursor-not-allowed opacity-45 grayscale" : "animate-float"}`}
                style={{ animationDelay: `${idx * 0.4}s`, ["--b" as string]: `var(--b-${isDone ? "green" : bubble[l.color]})`, ["--bd" as string]: `var(--b-${isDone ? "green" : bubble[l.color]}-d)` }}
              >
                {l.icon}
                {isDone && <Star className="absolute -right-2 -top-2 h-12 w-12 fill-yellow text-yellow" strokeWidth={2} />}
                {isLocked && <span className="absolute inset-0 flex items-center justify-center rounded-full bg-[var(--home-navy)]/35"><Lock className="h-10 w-10 text-white" /></span>}
              </button>
              <span className={`mt-5 rounded-full px-4 py-1 font-display text-xl font-bold ${isLocked ? "bg-[var(--home-nav)] text-[var(--home-navy)]/55" : "bg-[var(--home-tag)] text-[var(--home-navy)]"}`}>{l.title}{isDone ? " · Concluída" : isLocked ? " · Bloqueada" : " · Disponível"}</span>
            </li>
          );
        })}
      </ol>
      {open && <Activity lesson={open} onClose={() => setOpen(null)} onDone={() => complete(open.id)} />}
    </Shell>
  );
}
