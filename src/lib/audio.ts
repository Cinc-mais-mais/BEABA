import { isSoundEnabled } from "./app";

let activeAudio: HTMLAudioElement | null = null;
let activeCancel: (() => void) | null = null;

export function stopAudioPlayback() {
  activeAudio?.pause();
  if (activeAudio) {
    activeAudio.currentTime = 0;
    activeAudio.onended = null;
    activeAudio.onerror = null;
  }
  activeAudio = null;
  activeCancel?.();
  activeCancel = null;
}

/** Stable, readable filename derived from text; recordings may be placed in public/audio/voice/. */
export function audioTextSlug(text: string) {
  return text.trim().toLocaleLowerCase("pt-BR")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
}

/** MP3-first local playback. If no clip exists, invokes the optional legacy speech fallback. */
export function playAudioFile(
  src: string,
  onEnded?: () => void,
  fallback?: () => (() => void),
) {
  if (typeof window === "undefined" || !isSoundEnabled()) return () => {};
  stopAudioPlayback();
  let cancelled = false;
  let audio: HTMLAudioElement | null = null;
  let cancelFallback = () => {};
  const finish = () => { if (!cancelled) { activeAudio = null; onEnded?.(); } };
  const startFallback = () => {
    if (cancelled || audio?.dataset.fallbackStarted === "true") return;
    if (audio) audio.dataset.fallbackStarted = "true";
    cancelFallback = fallback?.() ?? (() => {});
    if (!fallback) finish();
  };
  audio = new Audio(src);
  activeAudio = audio;
  audio.onended = finish;
  audio.onerror = startFallback;
  void audio.play().catch(startFallback);
  return () => {
    cancelled = true;
    if (activeAudio === audio) activeAudio = null;
    audio?.pause();
    if (audio) { audio.currentTime = 0; audio.onended = null; audio.onerror = null; }
    cancelFallback();
  };
}

export function playAudioText(
  text: string,
  onEnded?: () => void,
  fallback?: () => (() => void),
) {
  const slug = audioTextSlug(text);
  if (!slug) { fallback?.(); return () => {}; }
  return playAudioFile(`/audio/voice/${slug}.mp3`, onEnded, fallback);
}
