import { useEffect, useState } from "react";

const SOUND_KEY = "beaba-sound-enabled";

export function isSoundEnabled() {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(SOUND_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SOUND_KEY, String(enabled));
  } catch {
    // Sound remains controllable for the current session if storage is unavailable.
  }
}

export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !isSoundEnabled()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "pt-BR";
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
}

/** Short cheerful tones via Web Audio (no files needed). */
export function chime(kind: "ok" | "try" | "win") {
  if (typeof window === "undefined" || !isSoundEnabled()) return;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const notes = kind === "ok" ? [523, 659, 784] : kind === "win" ? [523, 659, 784, 1047] : [330, 294];
  notes.forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = kind === "try" ? "sine" : "triangle";
    o.frequency.value = f;
    const t = ctx.currentTime + i * 0.13;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.32);
  });
}

export type Question = { emoji: string; before: string; after: string; answer: string; options: string[]; word: string };
export type Sentence = { emoji: string; words: string[]; extras: string[] };
export type Lesson = { id: string; title: string; icon: string; color: "red" | "yellow" | "blue" | "orange"; intro: string; questions: Question[]; sentences?: Sentence[] };

const q = (emoji: string, word: string, before: string, answer: string, after: string, options: string[]): Question => ({ emoji, word, before, answer, after, options });

export const LESSONS: Lesson[] = [
  { id: "vogais", title: "Vogais", icon: "A", color: "red", intro: "Toque na vogal que falta.", questions: [
    q("🐝", "abelha", "", "A", "BELHA", ["A", "E", "O"]),
    q("🥚", "ovo", "", "O", "VO", ["U", "O", "I"]),
    q("🍇", "uva", "", "U", "VA", ["A", "U", "E"]),
  ]},
  { id: "silaba", title: "Sílaba Faltosa", icon: "BO", color: "blue", intro: "Toque na sílaba que falta para completar a palavra.", questions: [
    q("🪆", "boneca", "BO", "NE", "CA", ["NE", "LA", "TA"]),
    q("🍿", "pipoca", "PI", "PO", "CA", ["CA", "PO", "MA"]),
    q("🍲", "panela", "PA", "NE", "LA", ["NE", "TO", "BI"]),
    q("🍅", "tomate", "TO", "MA", "TE", ["PA", "MA", "BI"]),
    q("🧥", "casaco", "CA", "SA", "CO", ["SA", "NE", "PO"]),
  ]},
  { id: "inicio", title: "Primeira Sílaba", icon: "RO", color: "yellow", intro: "Toque na sílaba do começo da palavra.", questions: [
    q("🐱", "gato", "", "GA", "TO", ["GA", "PA", "BO"]),
    q("🏠", "casa", "", "CA", "SA", ["MA", "CA", "TE"]),
    q("🦆", "pato", "", "PA", "TO", ["LU", "PA", "SO"]),
  ]},
  { id: "final", title: "Última Sílaba", icon: "VU", color: "orange", intro: "Toque na sílaba do final da palavra.", questions: [
    q("🌙", "lua", "LU", "A", "", ["A", "O", "E"]),
    q("🍝", "massa", "MAS", "SA", "", ["SA", "TO", "PE"]),
    q("🐦", "pássaro", "PÁSSA", "RO", "", ["LA", "RO", "MI"]),
  ]},
  { id: "frases", title: "Monte a Frase", icon: "Aa", color: "red", intro: "Ouça a frase e toque nas palavras na ordem certa.", questions: [], sentences: [
    { emoji: "🐱", words: ["O", "GATO", "BEBE", "LEITE"], extras: ["CASA", "PULA"] },
    { emoji: "☀️", words: ["O", "SOL", "ESTÁ", "QUENTE"], extras: ["LUA", "FRIO"] },
    { emoji: "🍞", words: ["EU", "COMO", "PÃO"], extras: ["BOLA", "VOU"] },
    { emoji: "🌧️", words: ["A", "CHUVA", "CAIU"], extras: ["PATO", "SOL"] },
  ]},
];

const KEY = "abc-progress";
export function useProgress() {
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { /* ignore */ }
  }, []);
  const complete = (id: string) => setDone((d) => {
    const next = d.includes(id) ? d : [...d, id];
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  });
  return { done, complete };
}


const PROFILE_STATS_KEY = "beaba-profile-stats";
export type ProfileStats = { correct: number; errors: number; lastLesson: string; lastAt: string | null; answers?: Record<string, boolean>; activeDates?: string[]; reviewedQuestions?: string[]; completedPhrases?: string[] };
const EMPTY_PROFILE_STATS: ProfileStats = { correct: 0, errors: 0, lastLesson: "", lastAt: null };

export function getProfileStats(): ProfileStats {
  if (typeof window === "undefined") return EMPTY_PROFILE_STATS;
  try {
    const saved = JSON.parse(window.localStorage.getItem(PROFILE_STATS_KEY) || "{}") as Partial<ProfileStats>;
    return {
      correct: Number.isFinite(saved.correct) ? Math.max(0, Number(saved.correct)) : 0,
      errors: Number.isFinite(saved.errors) ? Math.max(0, Number(saved.errors)) : 0,
      lastLesson: typeof saved.lastLesson === "string" ? saved.lastLesson : "",
      lastAt: typeof saved.lastAt === "string" ? saved.lastAt : null,
      answers: saved.answers && typeof saved.answers === "object" ? saved.answers : {},
      activeDates: Array.isArray(saved.activeDates) ? saved.activeDates.filter((day): day is string => typeof day === "string") : [],
      reviewedQuestions: Array.isArray(saved.reviewedQuestions) ? saved.reviewedQuestions.filter((id): id is string => typeof id === "string") : [],
      completedPhrases: Array.isArray(saved.completedPhrases) ? saved.completedPhrases.filter((id): id is string => typeof id === "string") : [],
    };
  } catch {
    return EMPTY_PROFILE_STATS;
  }
}

function saveProfileStats(stats: ProfileStats) {
  try { window.localStorage.setItem(PROFILE_STATS_KEY, JSON.stringify(stats)); } catch { /* Keep current session usable if storage is full. */ }
}

export function recordLessonStarted(lesson: Lesson) {
  if (typeof window === "undefined") return;
  saveProfileStats({ ...getProfileStats(), lastLesson: lesson.title, lastAt: new Date().toISOString() });
}

export function recordActivityAnswer(answerId: string, correct: boolean) {
  if (typeof window === "undefined") return;
  const stats = getProfileStats();
  const previous = stats.answers || {};
  const answers = { ...previous, [answerId]: correct };
  const values = Object.values(answers);
  const today = new Date().toLocaleDateString("en-CA");
  const activeDates = [...new Set([...(stats.activeDates || []), today])].sort();
  const reviewedQuestions = correct && previous[answerId] === false
    ? [...new Set([...(stats.reviewedQuestions || []), answerId])]
    : stats.reviewedQuestions || [];
  saveProfileStats({ ...stats, answers, activeDates, reviewedQuestions, correct: values.filter(Boolean).length, errors: values.filter((value) => !value).length });
}

export function recordPhraseCompleted(phraseId: string) {
  if (typeof window === "undefined") return;
  const stats = getProfileStats();
  const completedPhrases = [...new Set([...(stats.completedPhrases || []), phraseId])];
  saveProfileStats({ ...stats, completedPhrases });
}


export type LibraryWord = { word: string; emoji: string; category: string };
const WORD_CATEGORIES: Record<string, string> = {
  abelha: "Animais", gato: "Animais", pato: "Animais", pássaro: "Animais",
  uva: "Frutas", tomate: "Frutas",
  boneca: "Objetos", panela: "Objetos", casaco: "Objetos", pipoca: "Alimentos",
  ovo: "Alimentos", massa: "Alimentos", pão: "Alimentos", leite: "Alimentos",
  casa: "Lugares", lua: "Natureza", sol: "Natureza", chuva: "Natureza",
  quente: "Natureza", frio: "Natureza",
};
const WORD_EMOJI: Record<string, string> = {
  abelha: "🐝", ovo: "🥚", uva: "🍇", boneca: "🪆", pipoca: "🍿",
  panela: "🍲", tomate: "🍅", casaco: "🧥", gato: "🐱", casa: "🏠",
  pato: "🦆", lua: "🌙", massa: "🍝", pássaro: "🐦", sol: "☀️",
  pão: "🍞", chuva: "🌧️", leite: "🥛",
};

/** Built from the current lesson content so the library grows with new activities. */
function buildWordLibrary(): LibraryWord[] {
  const words = new Map<string, LibraryWord>();
  const add = (raw: string, emoji = "") => {
    const word = raw.trim().toLocaleLowerCase("pt-BR");
    if (!word || word.length < 2 || words.has(word) || ["eu", "o", "a", "os", "as", "e"].includes(word)) return;
    words.set(word, {
      word,
      emoji: emoji || WORD_EMOJI[word] || "🔤",
      category: WORD_CATEGORIES[word] || "Outras palavras",
    });
  };

  for (const lesson of LESSONS) {
    for (const question of lesson.questions) add(question.word, question.emoji);
    for (const sentence of lesson.sentences || []) {
      for (const word of [...sentence.words, ...sentence.extras]) add(word);
    }
  }

  return Array.from(words.values()).sort((a, b) =>
    a.category.localeCompare(b.category, "pt-BR") ||
    a.word.localeCompare(b.word, "pt-BR")
  );
}

export const WORD_LIBRARY: LibraryWord[] = buildWordLibrary();
const COMPLETED_WORDS_KEY = "beaba-completed-words";

export function getCompletedWords(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(COMPLETED_WORDS_KEY) || "[]");
    return Array.isArray(saved)
      ? saved.filter((word): word is string => typeof word === "string")
      : [];
  } catch {
    return [];
  }
}

export function recordCompletedWord(rawWord: string) {
  if (typeof window === "undefined") return;
  const word = rawWord.trim().toLocaleLowerCase("pt-BR");
  if (!word || !WORD_LIBRARY.some((item) => item.word === word)) return;
  const completed = new Set(getCompletedWords());
  completed.add(word);
  try {
    window.localStorage.setItem(COMPLETED_WORDS_KEY, JSON.stringify(Array.from(completed)));
  } catch {
    // Keep the exercise usable if browser storage is unavailable.
  }
}


export type Achievement = { id: string; title: string; description: string; icon: string; unlocked: boolean };
export function getAchievements(done: string[], stats: ProfileStats): Achievement[] {
  const correct = stats.correct || 0;
  const activeDates = new Set(stats.activeDates || []);
  let streak = 0;
  const now = new Date();
  const today = now.toLocaleDateString("en-CA");
  const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterday = yesterdayDate.toLocaleDateString("en-CA");
  let cursor = activeDates.has(today) ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : activeDates.has(yesterday) ? yesterdayDate : null;
  while (cursor && activeDates.has(cursor.toLocaleDateString("en-CA"))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  const reviewed = (stats.reviewedQuestions || []).length;
  const phrases = (stats.completedPhrases || []).length;
  return [
    { id: "primeiro-acerto", title: "Primeiro acerto", description: "Acertou sua primeira resposta.", icon: "🌟", unlocked: correct >= 1 },
    { id: "cinco-acertos", title: "Memória afiada", description: "Conquistou 5 acertos.", icon: "🧠", unlocked: correct >= 5 },
    { id: "dez-acertos", title: "Aprendiz dedicado", description: "Conquistou 10 acertos.", icon: "🏅", unlocked: correct >= 10 },
    { id: "primeira-atividade", title: "Primeira conquista", description: "Concluiu sua primeira atividade.", icon: "🎯", unlocked: done.length >= 1 },
    { id: "tres-atividades", title: "Explorador do saber", description: "Concluiu 3 atividades diferentes.", icon: "🧭", unlocked: done.length >= 3 },
    { id: "toda-trilha", title: "Trilha completa", description: "Concluiu todas as atividades disponíveis.", icon: "🏆", unlocked: LESSONS.length > 0 && done.length >= LESSONS.length },
    { id: "primeira-frase", title: "Frase completa", description: "Montou sua primeira frase corretamente.", icon: "💬", unlocked: phrases >= 1 },
    { id: "tres-frases", title: "Construtor de frases", description: "Montou 3 frases corretamente.", icon: "📝", unlocked: phrases >= 3 },
    { id: "tres-dias", title: "Presença constante", description: "Praticou em 3 dias diferentes, seguidos.", icon: "🔥", unlocked: streak >= 3 },
    { id: "sete-dias", title: "Uma semana de aprendizado", description: "Praticou por 7 dias seguidos.", icon: "📅", unlocked: streak >= 7 },
    { id: "primeira-revisao", title: "Aprender revisando", description: "Corrigiu uma questão que antes havia errado.", icon: "🔁", unlocked: reviewed >= 1 },
    { id: "cinco-revisoes", title: "Não desiste nunca", description: "Corrigiu 5 questões em revisões.", icon: "💪", unlocked: reviewed >= 5 },
  ];
}
