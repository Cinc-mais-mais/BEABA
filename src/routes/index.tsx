import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Star, Lock, Volume2, BookOpen, ArrowRight } from "lucide-react";
import logo from "@/assets/iconpng.png";
import { Shell } from "@/components/Shell";
import { Activity } from "@/components/Activity";
import { LESSONS, speak, useProgress, recordLessonStarted, type Lesson } from "@/lib/app";
import { stopGoogleLiveSpeech, unlockGoogleLiveAudio } from "@/lib/google-live-speech";
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
type TutorialStage = "checking" | "welcome-selection-first" | "welcome-selection-second" | "welcome-selection-ready" | "home-intro" | "home-prompt" | "home-ready" | "activity" | "trail-animation" | "trail-intro" | "font-intro" | "font-prompt" | "font-ready" | "inactive";

function Index() {
  const { done, complete } = useProgress();
  const [open, setOpen] = useState<Lesson | null>(null);
  const [cheatUnlocked, setCheatUnlocked] = useState(() => { try { return window.localStorage.getItem("beaba-dev-mode-enabled") === "true"; } catch { return false; } });
  const [developerLevelsUnlocked, setDeveloperLevelsUnlocked] = useState(() => { try { return window.localStorage.getItem("beaba-dev-unlock-levels") === "true"; } catch { return false; } });
  const [cheatPanel, setCheatPanel] = useState(false);
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
  const [trail, setTrail] = useState({ width: 0, height: 0, path: "", firstSegment: "" });
  const listRef = useRef<HTMLOListElement | null>(null);
  const bubbleRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const tutorialStatus = window.localStorage.getItem(TUTORIAL_PHASE_ONE.storageKey);
      const developerTutorialSkip = window.localStorage.getItem("beaba-tutorial-skip") === "true";
      const savedDone = JSON.parse(window.localStorage.getItem("abc-progress") || "[]") as string[];
      if (developerTutorialSkip || savedDone.length >= LESSONS.length || tutorialStatus === "done") {
        setTutorialStage("inactive");
        return;
      }
      if (tutorialStatus === "activity-completed") {
        setTutorialStage("trail-animation");
        return;
      }
      if (savedDone.includes(TUTORIAL_PHASE_ONE.lessonId)) {
        window.localStorage.setItem(TUTORIAL_PHASE_ONE.storageKey, "done");
        setTutorialStage("inactive");
        return;
      }
      setTutorialStage("welcome-selection-first");
    } catch {
      setTutorialStage("welcome-selection-first");
    }
  }, []);

  useEffect(() => {
    const handler = () => { setCheatUnlocked(true); setCheatPanel(true); try { window.localStorage.setItem("beaba-dev-mode-enabled", "true"); } catch {} };
    window.addEventListener("beaba-dev-mode", handler);
    return () => window.removeEventListener("beaba-dev-mode", handler);
  }, []);



  useEffect(() => {
    if (tutorialStage === "welcome-selection-first") {
      return playTutorialNarration("selectionLearn", {}, () => setTutorialStage("welcome-selection-second"));
    }
    if (tutorialStage === "welcome-selection-second") {
      return playTutorialNarration("selectionSkip", {}, () => setTutorialStage("welcome-selection-ready"));
    }

    const stages = {
      "home-intro": ["homeIntroduction", "home-prompt"],
      "home-prompt": ["continueActivity", "home-ready"],
      "trail-intro": ["trailCompleted", "font-intro"],
      "font-prompt": ["largeTextGuide", "font-ready"],
    } as const;
    const stage = stages[tutorialStage as keyof typeof stages];
    if (!stage) return;
    const [narration, nextStage] = stage;
    return playTutorialNarration(narration, {}, () => setTutorialStage(nextStage));
  }, [tutorialStage]);

  useEffect(() => {
    if (tutorialStage === "trail-animation") {
      window.requestAnimationFrame(() => {
        bubbleRefs.current[1]?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      const timer = window.setTimeout(() => setTutorialStage("trail-intro"), 1450);
      return () => window.clearTimeout(timer);
    }
    if (tutorialStage === "font-intro") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      const timer = window.setTimeout(() => setTutorialStage("font-prompt"), 550);
      return () => window.clearTimeout(timer);
    }
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
    if (!guidedTutorial) { setTutorialStage("inactive"); setHighlightContinue(false); }
    recordLessonStarted(lesson);
    setOpen(lesson);
  };

  const finishGuidedLesson = (lessonId: string) => {
    const finishedIndex = LESSONS.findIndex((lesson) => lesson.id === lessonId);
    const next = LESSONS[finishedIndex + 1];
    complete(lessonId);
    setOpen(null);
    setTutorialActivity(false);
    setCompletedAnimationId(lessonId);
    setHighlightContinue(false);
    if (next) setUnlockedAnimationId(next.id);
    try {
      window.localStorage.setItem(TUTORIAL_PHASE_ONE.storageKey, "activity-completed");
    } catch {
      // A sequência continua nesta sessão se o armazenamento local estiver indisponível.
    }
    setTutorialStage("trail-animation");
  };

  const finishTextSizeTutorial = () => {
    try {
      window.localStorage.setItem(TUTORIAL_PHASE_ONE.storageKey, "done");
      window.localStorage.setItem("beaba-guided-first-access", "done");
    } catch {
      // O tutorial permanece concluído durante a sessão atual.
    }
    setTutorialStage("inactive");
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

    let frame = 0;
    const updateTrail = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const listRect = list.getBoundingClientRect();
        const pointElements = Array.from(list.querySelectorAll<HTMLElement>("[data-trail-point]"));
        const points = pointElements.map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            x: rect.left + rect.width / 2 - listRect.left,
            y: rect.top + rect.height / 2 - listRect.top,
          };
        });

        if (points.length < 2) {
          setTrail({ width: listRect.width, height: listRect.height, path: "", firstSegment: "" });
          return;
        }

        let path = `M ${points[0].x} ${points[0].y}`;
        let firstSegment = "";
        for (let i = 1; i < points.length; i++) {
          const previous = points[i - 1];
          const current = points[i];
          const middleY = (previous.y + current.y) / 2;
          const direction = current.x >= previous.x ? 1 : -1;
          const bend = Math.max(18, Math.abs(current.x - previous.x) * 0.28);
          const segment = ` C ${previous.x + direction * bend} ${middleY}, ${current.x - direction * bend} ${middleY}, ${current.x} ${current.y}`;
          path += segment;
          if (i === 1) firstSegment = `M ${points[0].x} ${points[0].y}${segment}`;
        }

        setTrail({ width: listRect.width, height: listRect.height, path, firstSegment });
      });
    };

    const resizeObserver = new ResizeObserver(() => {
      list.querySelectorAll<HTMLElement>("[data-trail-point]").forEach((element) => resizeObserver.observe(element));
      updateTrail();
    });
    resizeObserver.observe(list);
    list.querySelectorAll<HTMLElement>("[data-trail-point]").forEach((element) => resizeObserver.observe(element));

    const mutationObserver = new MutationObserver(() => {
      list.querySelectorAll<HTMLElement>("[data-trail-point]").forEach((element) => resizeObserver.observe(element));
      updateTrail();
    });
    mutationObserver.observe(list, { childList: true, subtree: true });

    window.addEventListener("resize", updateTrail);
    window.addEventListener("load", updateTrail);
    void document.fonts?.ready.then(updateTrail);
    updateTrail();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", updateTrail);
      window.removeEventListener("load", updateTrail);
    };
  }, [tutorialStage]);

  if (tutorialStage === "checking") {
    return <div className="fixed inset-0 bg-[var(--home-header)]" aria-label="Preparando o Beabá" />;
  }

  if (tutorialStage === "welcome-selection-first" || tutorialStage === "welcome-selection-second" || tutorialStage === "welcome-selection-ready") {
    const highlightedTarget = tutorialStage === "welcome-selection-first" ? "listen" : tutorialStage === "welcome-selection-second" ? "start" : null;
    return (
      <WelcomeTutorialScreen
        highlightedTarget={highlightedTarget}
        onListen={() => {
          try {
            window.localStorage.setItem(TUTORIAL_PHASE_ONE.instructionsSeenStorageKey, "true");
          } catch (error) {
            console.error("Could not save the tutorial instruction preference.", error);
          }
          try {
            void unlockGoogleLiveAudio().catch((error: unknown) => {
              console.error("Unable to enable Google Live audio.", error);
            });
          } catch (error) {
            console.error("Unable to enable Google Live audio.", error);
          }
          setTutorialStage("home-intro");
        }}
        onStart={() => {
          stopGoogleLiveSpeech();
          try {
            window.localStorage.setItem("beaba-tutorial-skip", "true");
            window.localStorage.setItem(TUTORIAL_PHASE_ONE.storageKey, "done");
            window.localStorage.setItem("beaba-guided-first-access", "done");
          } catch (error) {
            console.error("Could not save the tutorial skip preference.", error);
          }
          setTutorialStage("inactive");
        }}
      />
    );
  }

  return (
    <Shell
      home
      tutorialNavLock={tutorialStage !== "inactive" && tutorialStage !== "checking"}
      highlightLargeText={tutorialStage === "font-prompt" || tutorialStage === "font-ready"}
      largeTextReady={tutorialStage === "font-ready"}
      onLargeTextTutorialToggle={finishTextSizeTutorial}
    >
      <h1 className="sr-only">Trilha de atividades</h1>
      <section className="mb-8 w-full rounded-[2rem] bg-[var(--home-nav)] p-5 shadow-[0_8px_20px_rgb(0_0_0/0.07)]"><div className="flex items-center justify-between gap-3"><div><p className="font-display text-lg font-extrabold text-[var(--home-navy)]">Sua jornada</p><p className="font-display text-sm font-bold text-[var(--home-navy)]">{completedCount} de {LESSONS.length} atividades concluídas</p></div><span className="font-display text-2xl font-extrabold tabular-nums text-[var(--home-navy)]">{progressPct}%</span></div><div className="mt-3 h-4 overflow-hidden rounded-full bg-[var(--home-tag)]" role="progressbar" aria-label="Progresso da trilha" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-[var(--b-blue)] transition-all duration-500" style={{ width: `${progressPct}%` }} /></div><p className="mt-3 text-center font-display text-sm font-bold text-[var(--home-navy)]" aria-live="polite">{encouragement}</p>{nextLesson ? <button type="button" disabled={tutorialStage === "home-intro"} onClick={() => {
          if ((tutorialStage === "home-prompt" || tutorialStage === "home-ready") && tutorialLesson) {
            stopGoogleLiveSpeech();
            setTutorialStage("activity");
            startLesson(tutorialLesson, true);
          } else {
            startLesson(nextLesson);
          }
        }} className={`mt-4 flex w-full items-center gap-3 rounded-2xl border border-[#158F4D] bg-[var(--b-green)] p-4 text-left text-white shadow-[0_7px_18px_rgb(21_143_77/0.28)] transition hover:-translate-y-0.5 hover:bg-[#19AA5D] hover:shadow-[0_10px_24px_rgb(21_143_77/0.34)] active:scale-[0.99] disabled:cursor-wait disabled:opacity-75 ${tutorialStage === "home-prompt" || tutorialStage === "home-ready" ? "tutorial-focus-target tutorial-home-focus" : ""} ${highlightContinue ? "animate-continue-highlight ring-4 ring-white ring-offset-4 ring-offset-[var(--b-green)]" : ""}`} data-tutorial-target="continue-activity"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-white bg-white text-2xl font-extrabold text-[#158F4D] shadow-sm">{nextLesson.icon}</span><span className="min-w-0 flex-1"><span className="block text-xs font-extrabold uppercase tracking-wide text-white/95">Sua próxima atividade</span><span className="block font-display text-lg font-extrabold text-white">{nextLesson.title}</span><span className="block text-sm font-extrabold text-white">Continuar aprendendo</span></span><ArrowRight className="h-8 w-8 shrink-0 text-white" strokeWidth={2.8} /></button> : <div className="mt-4 rounded-2xl bg-white/75 p-4 text-center font-display font-extrabold text-[var(--home-navy)]">Você concluiu todas as atividades!</div>}</section>
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
            style={{ strokeWidth: 7, strokeDasharray: "1 18" }}
          />
          {done.includes(TUTORIAL_PHASE_ONE.lessonId) && trail.firstSegment && (
            <path
              d={trail.firstSegment}
              pathLength={100}
              fill="none"
              stroke="var(--b-green)"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className={tutorialStage === "trail-animation" ? "tutorial-trail-progress" : ""}
              style={{ strokeWidth: 9, strokeDasharray: tutorialStage === "trail-animation" ? "0 100" : "100 0" }}
            />
          )}
        </svg>
        {LESSONS.map((l, idx) => {
          const isDone = done.includes(l.id);
          const isLocked = !isDone && nextLessonIndex >= 0 && idx > nextLessonIndex;
          return (
            <li key={l.id} className={`relative z-10 flex flex-col items-center ${offsets[idx] ?? "self-center"}`}>
              <div className="relative">
              <button
                ref={(element) => { bubbleRefs.current[idx] = element; }}
                data-trail-point
                onClick={() => { if (!isLocked || developerLevelsUnlocked) startLesson(l); }}
                disabled={isLocked && !developerLevelsUnlocked}
                aria-label={`${l.title}${isDone ? ", concluída" : isLocked ? ", bloqueada" : ", disponível"}`}
                className={`home-bubble balloon-shine flex h-[130px] w-[130px] items-center justify-center rounded-full font-display text-5xl font-extrabold text-[#FFFFFF] ${isLocked ? "cursor-not-allowed opacity-45 grayscale" : completedAnimationId === l.id || unlockedAnimationId === l.id || introTarget === idx ? "" : "animate-float"} ${completedAnimationId === l.id ? "animate-bubble-complete" : ""} ${unlockedAnimationId === l.id ? "animate-bubble-unlock" : ""} ${introTarget === idx ? "guided-bubble-highlight" : ""}`}
                style={{ animationDelay: `${idx * 0.4}s`, ["--b" as string]: `var(--b-${isDone ? "green" : bubble[l.color]})`, ["--bd" as string]: `var(--b-${isDone ? "green" : bubble[l.color]}-d)` }}
              >
                {l.icon}
                {isDone && <Star className="absolute -right-2 -top-2 h-12 w-12 fill-yellow text-yellow" strokeWidth={2} />}
                {isLocked && !developerLevelsUnlocked && <span className="absolute inset-0 flex items-center justify-center rounded-full bg-[var(--home-navy)]/35"><Lock className="h-10 w-10 text-white" /></span>}
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
      {!open && (tutorialStage === "home-intro" || tutorialStage === "home-prompt" || tutorialStage === "home-ready") && (
        <div
          className={`tutorial-dim-layer fixed inset-0 z-[40] pointer-events-none ${tutorialStage === "home-intro" ? "bg-transparent" : "bg-slate-950/20"}`}
          aria-hidden="true"
        />
      )}
      {cheatPanel && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4"><section className="w-full max-w-md rounded-3xl p-6 shadow-2xl" style={{ backgroundColor: "var(--app-surface, #FFFFFF)", color: "var(--app-text, #172033)" }}><h2 className="mb-3 text-2xl font-extrabold">Modo de desenvolvedor</h2><p className="mb-4">Atalhos de teste: atividades bloqueadas acessíveis e conclusão fora da sequência.</p><div className="flex flex-col gap-3"><button className="rounded-xl bg-[var(--b-green)] p-3 font-bold text-white" onClick={() => { setTutorialStage("inactive"); setTutorialActivity(false); try { window.localStorage.setItem(TUTORIAL_PHASE_ONE.storageKey,"done"); window.localStorage.setItem("beaba-guided-first-access","done"); window.localStorage.setItem("beaba-tutorial-skip","true"); window.localStorage.setItem("beaba-dev-mode-enabled","true"); window.localStorage.setItem("beaba-dev-unlock-levels","false"); } catch {} setDeveloperLevelsUnlocked(false); setCheatUnlocked(true); setCheatPanel(false); }}>Pular tutorial</button><button className="rounded-xl bg-[var(--b-blue)] p-3 font-bold text-white" onClick={() => { setDeveloperLevelsUnlocked(true); try { window.localStorage.setItem("beaba-dev-unlock-levels","true"); window.localStorage.setItem("beaba-dev-mode-enabled","true"); } catch {} setCheatUnlocked(true); setCheatPanel(false); }}>Liberar atividades bloqueadas</button><button className="rounded-xl bg-slate-600 p-3 font-bold text-white" onClick={() => setCheatPanel(false)}>Fechar</button></div></section></div>}
      {open && <Activity
        lesson={open}
        tutorial={tutorialActivity}
        onClose={() => {
          if (tutorialActivity) return;
          setOpen(null);
          setTutorialActivity(false);
          try { setTutorialStage(window.localStorage.getItem("beaba-tutorial-skip") === "true" || window.localStorage.getItem(TUTORIAL_PHASE_ONE.storageKey) === "done" ? "inactive" : "home-prompt"); } catch { setTutorialStage("home-prompt"); }
        }}
        onDone={() => {
          if (tutorialActivity && open.id === TUTORIAL_PHASE_ONE.lessonId) {
            finishGuidedLesson(open.id);
          } else {
            finishLesson(open.id);
          }
        }}
      />}
    </Shell>
  );
}

function WelcomeTutorialScreen({
  highlightedTarget,
  onListen,
  onStart,
}: {
  highlightedTarget: "listen" | "start" | null;
  onListen: () => void;
  onStart: () => void;
}) {
  return (
    <main className="welcome-tutorial fixed inset-0 z-[100] flex min-h-dvh flex-col items-center justify-between overflow-y-auto bg-[var(--home-header)] px-6 py-10 text-white sm:py-14">
      <div className="flex w-full flex-1 flex-col items-center justify-start gap-6 pt-[5dvh]">
        <img src={logo} alt="Ícone do aplicativo Beabá" className="max-h-[42dvh] w-[min(72vw,340px)] object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.2)]" />
        <h1 className="max-w-xl text-center font-display text-3xl font-extrabold leading-tight sm:text-4xl">Olá! Você está no Beabá.</h1>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-3 pb-4">
        {highlightedTarget && <div className="tutorial-dim-layer fixed inset-0 z-0 bg-slate-950/20 pointer-events-none" aria-hidden="true" />}
        <button
          type="button"
          onClick={onListen}
          className={`relative z-10 flex min-h-[68px] w-full items-center justify-center rounded-2xl bg-white px-8 py-4 font-display text-2xl font-extrabold text-[var(--home-header)] shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition active:scale-95 ${highlightedTarget === "listen" ? "tutorial-focus-target" : ""}`}
        >
          Ouvir instruções
        </button>
        <button
          type="button"
          onClick={onStart}
          className={`relative z-10 flex min-h-[68px] w-full items-center justify-center rounded-2xl border-2 border-white bg-transparent px-8 py-4 font-display text-2xl font-extrabold text-white shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition active:scale-95 ${highlightedTarget === "start" ? "tutorial-focus-target" : ""}`}
        >
          Iniciar
        </button>
      </div>
    </main>
  );
}
