import { useEffect, useMemo, useState } from "react";
import { X, Star, Volume2, Undo2 } from "lucide-react";
import { chime, speak, recordActivityAnswer, type Lesson, type Sentence } from "@/lib/app";

const bg = { red: "bg-red", yellow: "bg-yellow", blue: "bg-blue", orange: "bg-orange" };
type Props = { lesson: Lesson; onClose: () => void; onDone: () => void };

export function Activity(props: Props) {
  return props.lesson.sentences ? <SentenceActivity {...props} sentences={props.lesson.sentences} /> : <SyllableActivity {...props} />;
}

function SentenceActivity({ lesson, sentences, onClose, onDone }: Props & { sentences: Sentence[] }) {
  const [i, setI] = useState(0);
  const [built, setBuilt] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const s = sentences[i] ?? sentences[0]!;
  const phrase = s.words.join(" ").toLowerCase();
  const tiles = useMemo(() => [...s.words, ...s.extras].map((w, k) => ({ w, k, r: Math.random() })).sort((a, b) => a.r - b.r), [s]);
  const complete = built.length === s.words.length;

  useEffect(() => {
    if (!finished) speak(`${lesson.intro} ${phrase}`);
  }, [i, finished, lesson.intro, phrase]);

  const choose = (idx: number, w: string) => {
    if (complete || built.includes(idx)) return;
    if (w === s.words[built.length]) {
      recordActivityAnswer(true);
      const next = [...built, idx];
      setBuilt(next);
      if (next.length === s.words.length) {
        chime("ok");
        speak(`Muito bem! ${phrase}`);
        setTimeout(() => {
          if (i + 1 < sentences.length) { setI(i + 1); setBuilt([]); }
          else { setFinished(true); chime("win"); speak("Parabéns! Você conseguiu sozinho! Ganhou uma estrela."); onDone(); }
        }, 2200);
      } else speak(w);
    } else {
      recordActivityAnswer(false);
      setWrong(idx);
      chime("try");
      speak("Quase! Tente de novo.");
      setTimeout(() => setWrong(null), 900);
    }
  };

  return (
    <div className="activity-screen fixed inset-0 z-50 overflow-y-auto bg-background" role="dialog" aria-modal="true" aria-label={lesson.title}>
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={onClose} aria-label="Fechar" className="pop flex h-16 w-16 items-center justify-center rounded-2xl bg-background">
            <X className="h-9 w-9" strokeWidth={3} />
          </button>
          <div className="h-6 flex-1 overflow-hidden rounded-full border-4 border-foreground">
            <div className={`h-full ${bg[lesson.color]} transition-all`} style={{ width: `${((i + (finished ? 1 : 0)) / sentences.length) * 100}%` }} />
          </div>
        </div>
        {finished ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center" data-speak="Parabéns! Você conseguiu!">
            <Star className="animate-celebrate h-40 w-40 fill-yellow text-foreground" strokeWidth={1.5} />
            <h2 className="text-5xl font-extrabold">Parabéns!</h2>
            <div className="text-6xl">👏 🎉 👏</div>
            <button onClick={onClose} className="pop rounded-3xl bg-success px-10 py-5 text-3xl font-extrabold text-primary-foreground">Continuar</button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-6" data-speak={`${lesson.intro} ${phrase}`}>
            <button onClick={() => speak(phrase)} aria-label="Ouvir a frase" className="pop relative flex h-44 w-44 items-center justify-center rounded-[2.5rem] bg-background text-[7rem] leading-none">
              <span aria-hidden>{s.emoji}</span>
              <span className="absolute -bottom-4 -right-4 flex h-14 w-14 items-center justify-center rounded-full border-4 border-foreground bg-orange text-primary-foreground">
                <Volume2 className="h-7 w-7" />
              </span>
            </button>
            <div className="flex min-h-24 w-full flex-wrap items-center justify-center gap-2 rounded-3xl border-4 border-dashed border-foreground p-3" aria-live="polite">
              {built.map((idx) => (
                <span key={idx} className={`animate-celebrate rounded-2xl px-3 py-2 font-display text-3xl font-extrabold ${complete ? "text-success" : ""}`}>{tiles.find((t) => t.k === idx)?.w}</span>
              ))}
            </div>
            {built.length > 0 && !complete && (
              <button onClick={() => setBuilt(built.slice(0, -1))} aria-label="Desfazer" className="pop flex h-14 items-center gap-2 rounded-2xl bg-background px-5 text-xl font-bold">
                <Undo2 className="h-7 w-7" /> Voltar
              </button>
            )}
            <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
              {tiles.map((t, n) => {
                const used = built.includes(t.k);
                const colors = ["bg-red", "bg-yellow", "bg-blue", "bg-orange"];
                return (
                  <button key={t.k} disabled={used} onClick={() => choose(t.k, t.w)}
                    className={`pop h-20 min-w-0 rounded-3xl font-display text-3xl font-extrabold ${colors[n % 4]} ${used ? "invisible" : ""} ${wrong === t.k ? "animate-shake opacity-60" : ""}`}>
                    {t.w}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SyllableActivity({ lesson, onClose, onDone }: Props) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const q = lesson.questions[i] ?? lesson.questions[0]!;

  useEffect(() => {
    if (!finished) speak(`${lesson.intro} ${q.word}`);
  }, [i, finished, lesson.intro, q.word]);

  const choose = (opt: string) => {
    if (picked) return;
    if (opt === q.answer) {
      recordActivityAnswer(true);
      setPicked(opt);
      chime("ok");
      speak(`Muito bem! ${q.word}`);
      setTimeout(() => {
        if (i + 1 < lesson.questions.length) { setI(i + 1); setPicked(null); setWrong(null); }
        else { setFinished(true); chime("win"); speak("Parabéns! Você conseguiu sozinho! Ganhou uma estrela."); onDone(); }
      }, 1600);
    } else {
      recordActivityAnswer(false);
      setWrong(opt);
      chime("try");
      speak("Quase! Tente de novo.");
      setTimeout(() => setWrong(null), 900);
    }
  };

  return (
    <div className="activity-screen fixed inset-0 z-50 overflow-y-auto bg-background" role="dialog" aria-modal="true" aria-label={lesson.title}>
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={onClose} aria-label="Fechar" className="pop flex h-16 w-16 items-center justify-center rounded-2xl bg-background">
            <X className="h-9 w-9" strokeWidth={3} />
          </button>
          <div className="h-6 flex-1 overflow-hidden rounded-full border-4 border-foreground">
            <div className={`h-full ${bg[lesson.color]} transition-all`} style={{ width: `${((i + (finished ? 1 : 0)) / lesson.questions.length) * 100}%` }} />
          </div>
        </div>

        {finished ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center" data-speak="Parabéns! Você conseguiu!">
            <Star className="animate-celebrate h-40 w-40 fill-yellow text-foreground" strokeWidth={1.5} />
            <h2 className="text-5xl font-extrabold">Parabéns!</h2>
            <div className="text-6xl">👏 🎉 👏</div>
            <button onClick={onClose} className="pop rounded-3xl bg-success px-10 py-5 text-3xl font-extrabold text-primary-foreground">
              Continuar
            </button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-8" data-speak={`${lesson.intro} ${q.word}`}>
            <button
              onClick={() => speak(q.word)}
              aria-label={`Ouvir a palavra ${q.word}`}
              className="pop relative flex h-56 w-56 items-center justify-center rounded-[2.5rem] bg-background text-[9rem] leading-none"
            >
              <span aria-hidden>{q.emoji}</span>
              <span className="absolute -bottom-4 -right-4 flex h-14 w-14 items-center justify-center rounded-full border-4 border-foreground bg-orange text-primary-foreground">
                <Volume2 className="h-7 w-7" />
              </span>
            </button>

            <p className="font-display text-6xl font-extrabold tracking-wider" aria-live="polite">
              {q.before}
              <span className={`mx-1 inline-block min-w-[2.2ch] border-b-[6px] border-foreground text-center ${picked ? "animate-celebrate text-success" : ""}`}>
                {picked ?? "\u00A0"}
              </span>
              {q.after}
            </p>

            <div className="grid w-full grid-cols-3 gap-4">
              {q.options.map((opt, k) => {
                const colors = ["bg-red", "bg-yellow", "bg-blue"];
                const isWrong = wrong === opt;
                const isRight = picked === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => choose(opt)}
                    className={`pop h-28 rounded-3xl font-display text-5xl font-extrabold ${isRight ? "bg-success text-primary-foreground" : colors[k % 3]} ${isWrong ? "animate-shake opacity-60" : ""}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
