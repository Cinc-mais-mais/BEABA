import { useEffect, useMemo, useRef, useState } from "react";
import { X, Star, Volume2, Undo2, CheckCircle2, ArrowRight } from "lucide-react";
import { chime, speak, recordActivityAnswer, recordPhraseCompleted, recordCompletedWord, type Lesson, type Sentence } from "@/lib/app";

type Props = { lesson: Lesson; onClose: () => void; onDone: () => void };

function shuffleArray<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Randomizes correct-answer positions in balanced cycles for each activity. */
function buildBalancedOptions(questions: Lesson["questions"]) {
  const positionBags = new Map<number, number[]>();

  return questions.map((question) => {
    const optionCount = question.options.length;
    if (optionCount <= 1) return [...question.options];

    let positions = positionBags.get(optionCount);
    if (!positions || positions.length === 0) {
      positions = shuffleArray(Array.from({ length: optionCount }, (_, index) => index));
      positionBags.set(optionCount, positions);
    }

    const correctPosition = positions.pop()!;
    const distractors = shuffleArray(question.options.filter((option) => option !== question.answer));
    const arranged = [...distractors];
    arranged.splice(Math.min(correctPosition, arranged.length), 0, question.answer);
    return arranged;
  });
}

export function Activity(props: Props) {
  return props.lesson.sentences ? <SentenceActivity {...props} sentences={props.lesson.sentences} /> : <SyllableActivity {...props} />;
}

function ActivityHeader({ onClose, title }: { onClose: () => void; title: string }) {
  return (
    <div className="flex items-center gap-4">
      <button onClick={onClose} aria-label="Sair da atividade" className="pop flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white">
        <X className="h-8 w-8" strokeWidth={2.8} />
      </button>
      <h1 className="min-w-0 flex-1 text-center text-2xl font-extrabold text-slate-800">{title}</h1>
      <span className="h-14 w-14 shrink-0" aria-hidden />
    </div>
  );
}

function SentenceActivity({ lesson, sentences, onClose, onDone }: Props & { sentences: Sentence[] }) {
  const [i, setI] = useState(0);
  const [built, setBuilt] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [awaitingNext, setAwaitingNext] = useState(false);
  const [finished, setFinished] = useState(false);
  const [inputLocked, setInputLocked] = useState(false);
  const nextGuard = useRef(false);
  const s = sentences[i] ?? sentences[0]!;
  const phrase = s.words.join(" ").toLowerCase();
  const tiles = useMemo(() => [...s.words, ...s.extras].map((w, k) => ({ w, k, r: Math.random() })).sort((a, b) => a.r - b.r), [s]);
  const complete = built.length === s.words.length;

  useEffect(() => {
    if (!finished) speak(`${lesson.intro} ${phrase}`);
  }, [i, finished, lesson.intro, phrase]);

  const choose = (idx: number, w: string) => {
    if (inputLocked || awaitingNext || complete || built.includes(idx)) return;
    if (w.toLocaleLowerCase("pt-BR") === s.words[built.length].toLocaleLowerCase("pt-BR")) {
      recordActivityAnswer(`${lesson.id}:frase:${i}:${built.length}`, true);
      const next = [...built, idx];
      setBuilt(next);
      setFeedback(next.length === s.words.length ? "Frase concluída! Muito bem." : "Muito bem! Essa palavra está correta.");
      if (next.length === s.words.length) {
        recordPhraseCompleted(`${lesson.id}:frase:${i}`);
        s.words.forEach((word) => recordCompletedWord(word));
        setAwaitingNext(true);
        chime("ok");
        speak(`Muito bem! ${phrase}`);
      } else speak(w);
    } else {
      recordActivityAnswer(`${lesson.id}:frase:${i}:${built.length}`, false);
      setFeedback("Quase! Tente outra palavra.");
      setWrong(idx);
      chime("try");
      speak("Quase! Tente de novo.");
      window.setTimeout(() => setWrong((current) => current === idx ? null : current), 700);
    }
  };

  const advance = () => {
    if (!awaitingNext || nextGuard.current) return;
    nextGuard.current = true;
    setInputLocked(true);
    setAwaitingNext(false);
    if (i + 1 < sentences.length) {
      setI((value) => value + 1);
      setBuilt([]);
      setWrong(null);
      setFeedback("Escolha as palavras para montar a frase.");
      window.setTimeout(() => { nextGuard.current = false; setInputLocked(false); }, 2000);
    } else {
      setFinished(true);
      chime("win");
      speak("Parabéns! Você concluiu a atividade.");
      onDone();
    }
  };

  return (
    <div className="activity-screen fixed inset-0 z-50 overflow-y-auto bg-[#F3F5F7]" role="dialog" aria-modal="true" aria-label={lesson.title}>
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-5 px-4 py-4 sm:py-6">
        <ActivityHeader onClose={onClose} title={lesson.title} />
        {finished ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 rounded-[2rem] border border-slate-200 bg-white p-8 text-center" data-speak="Parabéns! Você conseguiu!">
            <Star className="animate-celebrate h-32 w-32 fill-yellow text-slate-800" strokeWidth={1.5} />
            <h2 className="text-4xl font-extrabold text-slate-900">Atividade concluída</h2>
            <p className="text-xl text-slate-700">Você montou todas as frases.</p>
            <button onClick={onClose} className="pop rounded-2xl bg-[#2877B8] px-9 py-4 text-2xl font-bold text-white">Continuar</button>
          </div>
        ) : (
          <section className="flex flex-1 flex-col items-center justify-center gap-5 rounded-[2rem] border border-slate-200 bg-white px-4 py-6 shadow-sm sm:px-8" data-speak={`${lesson.intro} ${phrase}`}>
            <button onClick={() => speak(phrase)} aria-label="Ouvir a frase" className="relative flex h-36 w-36 items-center justify-center rounded-3xl bg-[#F0F4F7] text-7xl">
              <span aria-hidden>{s.emoji}</span>
              <span className="absolute -bottom-3 -right-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-[#D66A19] text-white shadow">
                <Volume2 className="h-6 w-6" />
              </span>
            </button>
            <p className="min-h-7 text-center text-lg font-bold text-slate-700" role="status" aria-live="polite">{feedback || "Monte a frase na ordem correta."}</p>
            <div className={`flex min-h-24 w-full flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-3 transition-colors ${complete ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-slate-50"}`} aria-live="polite">
              {built.map((idx) => (
                <span key={idx} className={`rounded-xl px-3 py-2 font-display text-2xl font-extrabold ${complete ? "text-emerald-800" : "text-slate-900"}`}>{tiles.find((t) => t.k === idx)?.w}</span>
              ))}
              {complete && <CheckCircle2 className="ml-1 h-7 w-7 text-emerald-700" aria-label="Correto" />}
            </div>
            {built.length > 0 && !complete && (
              <button disabled={inputLocked} onClick={() => setBuilt(built.slice(0, -1))} aria-label="Desfazer última palavra" className="pop flex h-12 items-center gap-2 rounded-xl bg-slate-100 px-5 text-lg font-bold text-slate-800 disabled:opacity-50">
                <Undo2 className="h-6 w-6" /> Voltar
              </button>
            )}
            <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
              {tiles.map((t, n) => {
                const used = built.includes(t.k);
                const colors = ["bg-[#F4D8D5]", "bg-[#F7E8B5]", "bg-[#D8EAF5]", "bg-[#E9E2F2]"];
                return (
                  <button key={t.k} disabled={used || complete || inputLocked || awaitingNext} onClick={() => choose(t.k, t.w)}
                    className={`pop h-16 min-w-0 rounded-2xl border-2 border-slate-700 font-display text-2xl font-extrabold text-slate-950 disabled:cursor-not-allowed ${colors[n % 4]} ${used ? "invisible" : ""} ${wrong === t.k ? "animate-shake" : ""}`}>
                    {t.w}
                  </button>
                );
              })}
            </div>
            <div className="min-h-[76px] w-full">
              {awaitingNext && (
                <button onClick={advance} className="pop flex min-h-[64px] w-full items-center justify-center gap-3 rounded-2xl bg-[#2877B8] px-6 py-3 text-xl font-extrabold text-white">
                  <CheckCircle2 className="h-6 w-6" /> {i + 1 < sentences.length ? "Próxima frase" : "Concluir atividade"} <ArrowRight className="h-6 w-6" />
                </button>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function SyllableActivity({ lesson, onClose, onDone }: Props) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [awaitingNext, setAwaitingNext] = useState(false);
  const [finished, setFinished] = useState(false);
  const [inputLocked, setInputLocked] = useState(false);
  const nextGuard = useRef(false);
  const q = lesson.questions[i] ?? lesson.questions[0]!;
  const displayedOptions = useMemo(() => buildBalancedOptions(lesson.questions), [lesson]);

  useEffect(() => {
    if (!finished) speak(`${lesson.intro} ${q.word}`);
  }, [i, finished, lesson.intro, q.word]);

  const choose = (opt: string) => {
    if (picked || inputLocked || awaitingNext) return;
    if (opt === q.answer) {
      recordActivityAnswer(`${lesson.id}:questao:${i}`, true);
      recordCompletedWord(q.word);
      setFeedback("Muito bem! Você acertou.");
      setPicked(opt);
      setAwaitingNext(true);
      chime("ok");
      speak(`Muito bem! ${q.word}`);
    } else {
      recordActivityAnswer(`${lesson.id}:questao:${i}`, false);
      setFeedback("Quase! Não tem problema. Tente novamente.");
      setWrong(opt);
      chime("try");
      speak("Quase! Tente de novo.");
      window.setTimeout(() => setWrong((current) => current === opt ? null : current), 700);
    }
  };

  const advance = () => {
    if (!awaitingNext || nextGuard.current) return;
    nextGuard.current = true;
    setInputLocked(true);
    setAwaitingNext(false);
    if (i + 1 < lesson.questions.length) {
      setI((value) => value + 1);
      setPicked(null);
      setWrong(null);
      setFeedback("");
      window.setTimeout(() => { nextGuard.current = false; setInputLocked(false); }, 2000);
    } else {
      setFinished(true);
      chime("win");
      speak("Parabéns! Você concluiu a atividade.");
      onDone();
    }
  };

  return (
    <div className="activity-screen fixed inset-0 z-50 overflow-y-auto bg-[#F3F5F7]" role="dialog" aria-modal="true" aria-label={lesson.title}>
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-5 px-4 py-4 sm:py-6">
        <ActivityHeader onClose={onClose} title={lesson.title} />
        {finished ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 rounded-[2rem] border border-slate-200 bg-white p-8 text-center" data-speak="Parabéns! Você conseguiu!">
            <Star className="animate-celebrate h-32 w-32 fill-yellow text-slate-800" strokeWidth={1.5} />
            <h2 className="text-4xl font-extrabold text-slate-900">Atividade concluída</h2>
            <p className="text-xl text-slate-700">Você completou todas as questões.</p>
            <button onClick={onClose} className="pop rounded-2xl bg-[#2877B8] px-9 py-4 text-2xl font-bold text-white">Continuar</button>
          </div>
        ) : (
          <section className="flex flex-1 flex-col items-center justify-center gap-6 rounded-[2rem] border border-slate-200 bg-white px-4 py-7 shadow-sm sm:px-8" data-speak={`${lesson.intro} ${q.word}`}>
            <button onClick={() => speak(q.word)} aria-label={`Ouvir a palavra ${q.word}`} className="relative flex h-44 w-44 items-center justify-center rounded-3xl bg-[#F0F4F7] text-8xl">
              <span aria-hidden>{q.emoji}</span>
              <span className="absolute -bottom-3 -right-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-[#D66A19] text-white shadow">
                <Volume2 className="h-6 w-6" />
              </span>
            </button>
            <p className="word-prompt font-display text-5xl font-extrabold tracking-wider text-slate-950 sm:text-6xl" aria-live="polite">
              {q.before}<span className={`mx-1 inline-block min-w-[2.2ch] border-b-[5px] border-slate-900 text-center ${picked ? "text-emerald-700" : ""}`}>{picked ?? "\u00A0"}</span>{q.after}
            </p>
            <p className="min-h-7 text-center text-lg font-bold text-slate-700" role="status" aria-live="polite">{feedback || "Escolha a parte que falta."}</p>
            <div className="grid w-full grid-cols-3 gap-3">
              {(displayedOptions[i] ?? q.options).map((opt, k) => {
                const colors = ["bg-[#F4D8D5]", "bg-[#F7E8B5]", "bg-[#D8EAF5]"];
                const isWrong = wrong === opt;
                const isRight = picked === opt;
                return (
                  <button
                    key={opt}
                    disabled={Boolean(picked) || inputLocked || awaitingNext}
                    onClick={() => choose(opt)}
                    className={`pop h-24 rounded-2xl border-2 border-slate-700 font-display text-4xl font-extrabold text-slate-950 disabled:cursor-not-allowed ${isRight ? "bg-emerald-200 ring-4 ring-emerald-500" : colors[k % 3]} ${isWrong ? "animate-shake" : ""}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            <div className="min-h-[76px] w-full">
              {awaitingNext && (
                <button onClick={advance} className="pop flex min-h-[64px] w-full items-center justify-center gap-3 rounded-2xl bg-[#2877B8] px-6 py-3 text-xl font-extrabold text-white">
                  <CheckCircle2 className="h-6 w-6" /> {i + 1 < lesson.questions.length ? "Próxima questão" : "Concluir atividade"} <ArrowRight className="h-6 w-6" />
                </button>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
