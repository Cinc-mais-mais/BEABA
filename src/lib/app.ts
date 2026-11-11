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
export type ProfileStats = { correct: number; errors: number; lastLesson: string; lastAt: string | null };
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

export function recordActivityAnswer(correct: boolean) {
  if (typeof window === "undefined") return;
  const stats = getProfileStats();
  saveProfileStats({ ...stats, correct: stats.correct + (correct ? 1 : 0), errors: stats.errors + (correct ? 0 : 1) });
}
