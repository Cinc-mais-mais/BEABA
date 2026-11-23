import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Star, Lock, Volume2, BookOpen, ArrowRight } from "lucide-react";
import logo from "@/assets/iconpng.png";
import { Shell } from "@/components/Shell";
import { Activity } from "@/components/Activity";
import { LESSONS, speak, useProgress, recordLessonStarted, type Lesson } from "@/lib/app";
import { playTutorialNarration, TUTORIAL_PHASE_ONE } from "@/lib/tutorial";

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
const offsets = ["self-start ml-6", "self-end mr-6", "self-center", "self-start ml-[18%] sm:ml-[28%] translate-y-8", "self-start ml-6"];
type TutorialStage = "checking" | "welcome-intro" | "welcome-prompt" | "welcome-ready" | "home-intro" | "home-prompt" | "home-ready" | "activity" | "inactive";

function Index() {
  const { done, complete } = useProgress();
  const [open, setOpen] = useState<Lesson | null>(null);
  const [tutorialStage, setTutorialStage] = useState<TutorialStage>("checking");
  const [tutorialActivity, setTutorialActivity] = useState(false);
  const [introTarget, setIntroTarget] = useState<number | null>(null);
  const [completedAnimationId, setCompletedAnimationId] = useState<string | null>(null);
  const [unlockedAnimationId, setUnlockedAnimationId] = useState<string | null>(null);
  const [highlightContinue, setHighlightContinue] = useState(false);
  const introHandled = useRef(false);
  const completedCount = done.length;
  const progressPct = LESSONS.length ? Math.round((completedCount / LESSONS.length) * 100) : 0;
  const nextLessonIndex = LESSONS.findIndex((lesson) => !done.includes(lesson.id));
  const nextLesson = nextLessonIndex >= 0 ? LESSONS[nextLessonIndex] : null;
  const tutorialLesson = LESSONS.find((lesson) => lesson.id === TUTORIAL_PHASE_ONE.lessonId) ?? nextLesson;
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
    if (typeof window === "undefined") return;
    try {
      const alreadyCompleted = window.localStorage.getItem(TUTORIAL_PHASE_ONE.storageKey) === "done";
      const savedDone = JSON.parse(window.localStorage.getItem("abc-progress") || "[]") as string[];
      if (alreadyCompleted || savedDone.length > 0) {
        window.localStorage.setItem(TUTORIAL_PHASE_ONE.storageKey, "done");
        setTutorialStage("inactive");
        return;
      }
      setTutorialStage("welcome-intro");
    } catch {
      setTutorialStage("welcome-intro");
    }
  }, []);

  useEffect(() => {
    const stages = {
      "welcome-intro": ["welcome", "welcome-prompt"],
      "welcome-prompt": ["welcomePrompt", "welcome-ready"],
      "home-intro": ["homeIntroduction", "home-prompt"],
      "home-prompt": ["continueActivity", "home-ready"],
    } as const;
    const stage = stages[tutorialStage as keyof typeof stages];
    if (!stage) return;
    const [narration, nextStage] = stage;
    return playTutorialNarration(narration, {}, () => setTutorialStage(nextStage));
  }, [tutorialStage]);

  useEffect(() => {
    if (tutorialStage !== "inactive" || introHandled.current || typeof window === "undefined") return;
    introHandled.current = true;
    try {
      if (window.localStorage.getItem("beaba-guided-first-access") === "done") return;
      const savedDone = JSON.parse(window.localStorage.getItem("abc-progress") || "[]") as string[];
      // The welcome highlight is exclusive to a genuinely new learner.
      // Existing learners should continue from their next available activity
      // without being told that it is their first activity.
      if (savedDone.length > 0) {
        window.localStorage.setItem("beaba-guided-first-access", "done");
        return;
      }
      window.requestAnimationFrame(() => {
        bubbleRefs.current[0]?.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(() => setIntroTarget(0), 450);
      });
    } catch {
      setIntroTarget(0);
    }
  }, [tutorialStage]);

  useEffect(() => {
    if (!completedAnimationId && !unlockedAnimationId && !highlightContinue) return;
    const timeout = window.setTimeout(() => {
      setCompletedAnimationId(null);
      setUnlockedAnimationId(null);
      setHighlightContinue(false);
    }, 2400);
    return () => window.clearTimeout(timeout);
  }, [completedAnimationId, unlockedAnimationId, highlightContinue]);

  const startLesson = (lesson: Lesson, guidedTutorial = false) => {
    if (introTarget !== null) {
      try { window.localStorage.setItem("beaba-guided-first-access", "done"); } catch { /* Intro remains dismissible in this session. */ }
      setIntroTarget(null);
    }
    setTutorialActivity(guidedTutorial);
    speak(lesson.title);
    recordLessonStarted(lesson);
    setOpen(lesson);
  };

  const finishLesson = (lessonId: string) => {
    const finishedIndex = LESSONS.findIndex((lesson) => lesson.id === lessonId);
    const next = LESSONS[finishedIndex + 1];
    complete(lessonId);
    setOpen(null);
    setCompletedAnimationId(lessonId);
    if (next) {
      setUnlockedAnimationId(next.id);
      setHighlightContinue(true);
    }
  };

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

  if (tutorialStage === "checking") {
    return <div className="fixed inset-0 bg-[var(--home-header)]" aria-label="Preparando o Beabá" />;
  }

  if (tutorialStage === "welcome-intro" || tutorialStage === "welcome-prompt" || tutorialStage === "welcome-ready") {
    return (
      <WelcomeTutorialScreen
        highlighted={tutorialStage === "welcome-prompt" || tutorialStage === "welcome-ready"}
        disabled={tutorialStage !== "welcome-ready"}
        onStart={() => setTutorialStage("home-intro")}
      />
    );
  }

  return (
    <Shell home>
      <h1 className="sr-only">Trilha de atividades</h1>
      <section className="mb-8 w-full rounded-[2rem] bg-[var(--home-nav)] p-5 shadow-[0_8px_20px_rgb(0_0_0/0.07)]"><div className="flex items-center justify-between gap-3"><div><p className="font-display text-lg font-extrabold text-[var(--home-navy)]">Sua jornada</p><p className="font-display text-sm font-bold text-[var(--home-navy)]">{completedCount} de {LESSONS.length} atividades concluídas</p></div><span className="font-display text-2xl font-extrabold tabular-nums text-[var(--home-navy)]">{progressPct}%</span></div><div className="mt-3 h-4 overflow-hidden rounded-full bg-[var(--home-tag)]" role="progressbar" aria-label="Progresso da trilha" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-[var(--b-blue)] transition-all duration-500" style={{ width: `${progressPct}%` }} /></div><p className="mt-3 text-center font-display text-sm font-bold text-[var(--home-navy)]" aria-live="polite">{encouragement}</p>{nextLesson ? <button type="button" disabled={tutorialStage === "home-intro" || tutorialStage === "home-prompt"} onClick={() => {
          if (tutorialStage === "home-ready" && tutorialLesson) {
            setTutorialStage("activity");
            startLesson(tutorialLesson, true);
          } else {
            startLesson(nextLesson);
          }
        }} className={`mt-4 flex w-full items-center gap-3 rounded-2xl border border-[#A9C7E2] bg-[#DCE6F2] p-4 text-left shadow-[0_6px_16px_rgb(35_87_141/0.14)] transition hover:-translate-y-0.5 hover:shadow-[0_9px_22px_rgb(35_87_141/0.2)] active:scale-[0.99] disabled:cursor-wait disabled:opacity-75 ${tutorialStage === "home-prompt" || tutorialStage === "home-ready" ? "tutorial-focus-target" : ""} ${highlightContinue ? "animate-continue-highlight ring-4 ring-[var(--b-green)]" : ""}`} data-tutorial-target="continue-activity"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl font-extrabold text-white" style={{ backgroundColor: "var(--home-header)" }}>{nextLesson.icon}</span><span className="min-w-0 flex-1"><span className="block text-xs font-bold uppercase tracking-wide text-[var(--home-navy)]">Sua próxima atividade</span><span className="block font-display text-lg font-extrabold text-[var(--home-navy)]">{nextLesson.title}</span><span className="block text-sm font-extrabold text-[#155E8A]">Continuar aprendendo</span></span><ArrowRight className="h-8 w-8 shrink-0 text-[var(--home-header)]" strokeWidth={2.8} /></button> : <div className="mt-4 rounded-2xl bg-white/75 p-4 text-center font-display font-extrabold text-[var(--home-navy)]">Você concluiu todas as atividades!</div>}</section>
      <div className="mb-4 flex justify-end">
        <Link to="/palavras" onClick={() => speak("Minhas palavras. Aqui ficam as palavras que você já completou nos exercícios.")} className="flex items-center gap-2 rounded-2xl bg-[var(--home-nav)] px-4 py-3 text-[var(--home-navy)] shadow-[0_5px_14px_rgb(0_0_0/0.08)] transition active:scale-95">
          <BookOpen className="h-7 w-7 text-[var(--b-blue)]" />
          <span className="font-display text-lg font-extrabold">Minhas palavras</span>
        </Link>
      </div>
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
              <div className="relative">
              <button
                ref={(element) => { bubbleRefs.current[idx] = element; }}
                onClick={() => { if (!isLocked) startLesson(l); }}
                disabled={isLocked}
                aria-label={`${l.title}${isDone ? ", concluída" : isLocked ? ", bloqueada" : ", disponível"}`}
                className={`home-bubble balloon-shine flex h-[130px] w-[130px] items-center justify-center rounded-full font-display text-5xl font-extrabold text-[#FFFFFF] ${isLocked ? "cursor-not-allowed opacity-45 grayscale" : completedAnimationId === l.id || unlockedAnimationId === l.id || introTarget === idx ? "" : "animate-float"} ${completedAnimationId === l.id ? "animate-bubble-complete" : ""} ${unlockedAnimationId === l.id ? "animate-bubble-unlock" : ""} ${introTarget === idx ? "guided-bubble-highlight" : ""}`}
                style={{ animationDelay: `${idx * 0.4}s`, ["--b" as string]: `var(--b-${isDone ? "green" : bubble[l.color]})`, ["--bd" as string]: `var(--b-${isDone ? "green" : bubble[l.color]}-d)` }}
              >
                {l.icon}
                {isDone && <Star className="absolute -right-2 -top-2 h-12 w-12 fill-yellow text-yellow" strokeWidth={2} />}
                {isLocked && <span className="absolute inset-0 flex items-center justify-center rounded-full bg-[var(--home-navy)]/35"><Lock className="h-10 w-10 text-white" /></span>}
              </button>
              {introTarget === idx && <div className="guided-intro-tooltip" role="status"><strong>Vamos começar por aqui!</strong><span>Toque nesta bolinha para entrar na primeira atividade.</span></div>}
              <button
                type="button"
                onClick={() => speak(`${l.title}. ${l.intro}`)}
                aria-label={`Ouvir explicação da atividade ${l.title}`}
                title={`Ouvir sobre ${l.title}`}
                className="absolute -right-14 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--b-blue)] text-white shadow-md transition active:scale-95"
              >
                <Volume2 className="h-7 w-7" strokeWidth={2.5} />
              </button>
              </div>
              <span className={`mt-5 rounded-full px-4 py-1 font-display text-xl font-bold ${isLocked ? "bg-[var(--home-nav)] text-[var(--home-navy)]/55" : "bg-[var(--home-tag)] text-[var(--home-navy)]"}`}>{l.title}{isDone ? " · Concluída" : isLocked ? " · Bloqueada" : " · Disponível"}</span>
            </li>
          );
        })}
      </ol>
      {(tutorialStage === "home-intro" || tutorialStage === "home-prompt" || tutorialStage === "home-ready") && (
        <div
          className={`tutorial-dim-layer fixed inset-0 z-[40] pointer-events-none ${tutorialStage === "home-intro" ? "bg-transparent" : "bg-slate-950/20"}`}
          aria-hidden="true"
        />
      )}
      {open && <Activity
        lesson={open}
        tutorial={tutorialActivity}
        onClose={() => {
          setOpen(null);
          if (tutorialActivity) setTutorialStage("home-prompt");
          setTutorialActivity(false);
        }}
        onTutorialFinished={() => {
          try {
            window.localStorage.setItem(TUTORIAL_PHASE_ONE.storageKey, "done");
            window.localStorage.setItem("beaba-guided-first-access", "done");
          } catch { /* Tutorial ends for this session even if browser storage is unavailable. */ }
          setTutorialActivity(false);
          setTutorialStage("inactive");
        }}
        onDone={() => finishLesson(open.id)}
      />}
    </Shell>
  );
}

function WelcomeTutorialScreen({ highlighted, disabled, onStart }: { highlighted: boolean; disabled: boolean; onStart: () => void }) {
  return (
    <main className="welcome-tutorial fixed inset-0 z-[100] flex min-h-dvh flex-col items-center justify-between overflow-y-auto bg-[var(--home-header)] px-6 py-10 text-white sm:py-14">
      <div className="flex w-full flex-1 flex-col items-center justify-start gap-6 pt-[5dvh]">
        <img src={logo} alt="Ícone do aplicativo Beabá" className="max-h-[42dvh] w-[min(72vw,340px)] object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.2)]" />
        <h1 className="max-w-xl text-center font-display text-3xl font-extrabold leading-tight sm:text-4xl">Olá! Você está no Beabá.</h1>
      </div>
      <div className="w-full max-w-sm pb-4">
        {highlighted && <div className="tutorial-dim-layer fixed inset-0 z-0 bg-slate-950/20 pointer-events-auto" aria-hidden="true" />}
        <button
          type="button"
          disabled={disabled}
          onClick={onStart}
          className={`relative z-10 flex min-h-[68px] w-full items-center justify-center rounded-2xl bg-white px-8 py-4 font-display text-2xl font-extrabold text-[var(--home-header)] shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition active:scale-95 disabled:opacity-80 ${highlighted ? "tutorial-focus-target" : ""}`}
        >
          Iniciar
        </button>
      </div>
    </main>
  );
}
