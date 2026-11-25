import type { LiveServerMessage, Session } from "@google/genai";
import { createGoogleLiveToken } from "./google-live-token";
import { GOOGLE_LIVE_CONFIG, GOOGLE_LIVE_MODEL } from "./google-live-config";

type ActiveSpeech = {
  cancelled: boolean;
  onEnded: (() => void) | undefined;
  text: string;
  sources: Set<AudioBufferSourceNode>;
  nextStartTime: number;
  turnComplete: boolean;
  receivedAudio: boolean;
};

let audioContext: AudioContext | null = null;
let currentSpeech: ActiveSpeech | null = null;
let responseSpeech: ActiveSpeech | null = null;
let queuedSpeech: ActiveSpeech | null = null;
let liveSession: Session | null = null;
let liveSessionPromise: Promise<Session> | null = null;
let sessionGeneration = 0;

export function decodePcm16(data: string): Float32Array<ArrayBuffer> {
  const binary = atob(data);
  const byteLength = binary.length - (binary.length % 2);
  const samples = new Float32Array(
    new ArrayBuffer((byteLength / 2) * Float32Array.BYTES_PER_ELEMENT),
  );

  for (let offset = 0; offset < byteLength; offset += 2) {
    const sample = binary.charCodeAt(offset) | (binary.charCodeAt(offset + 1) << 8);
    samples[offset / 2] = (sample > 32767 ? sample - 65536 : sample) / 32768;
  }

  return samples;
}

function getAudioContext() {
  if (typeof window === "undefined" || !window.AudioContext) {
    throw new Error("Este navegador não oferece suporte à reprodução de áudio.");
  }

  audioContext ??= new window.AudioContext();
  return audioContext;
}

export function unlockGoogleLiveAudio() {
  const context = getAudioContext();
  return context.state === "suspended" ? context.resume() : Promise.resolve();
}

function clearAudio(speech: ActiveSpeech) {
  for (const source of speech.sources) {
    source.onended = null;
    source.stop();
    source.disconnect();
  }
  speech.sources.clear();
}

function finishResponse(speech: ActiveSpeech) {
  if (responseSpeech !== speech) return;

  responseSpeech = null;
  if (!speech.cancelled && currentSpeech === speech) {
    currentSpeech = null;
    speech.cancelled = true;
    speech.onEnded?.();
  }

  const nextSpeech = queuedSpeech;
  queuedSpeech = null;
  if (nextSpeech && !nextSpeech.cancelled && liveSession) {
    sendSpeech(liveSession, nextSpeech);
  }
}

function failSpeech(speech: ActiveSpeech, error: unknown) {
  const isCurrent = currentSpeech === speech && !speech.cancelled;
  if (!isCurrent && responseSpeech !== speech) return;
  if (!speech.cancelled) console.error("Google Live voice reading failed.", error);
  clearAudio(speech);

  if (responseSpeech === speech) {
    finishResponse(speech);
  } else {
    currentSpeech = null;
    speech.cancelled = true;
    speech.onEnded?.();
  }
}

function playAudioChunk(speech: ActiveSpeech, data: string) {
  const context = getAudioContext();
  const samples = decodePcm16(data);
  if (samples.length === 0) return;
  speech.receivedAudio = true;

  const buffer = context.createBuffer(1, samples.length, 24_000);
  buffer.copyToChannel(samples, 0);

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  speech.sources.add(source);

  const startTime = Math.max(context.currentTime + 0.02, speech.nextStartTime);
  speech.nextStartTime = startTime + buffer.duration;
  source.onended = () => {
    speech.sources.delete(source);
    source.disconnect();
    if (speech.turnComplete && speech.sources.size === 0) finishResponse(speech);
  };
  source.start(startTime);
}

function handleLiveMessage(message: LiveServerMessage) {
  const response = responseSpeech;
  if (!response) return;

  const content = message.serverContent;
  if (!content) return;

  if (content.interrupted) {
    clearAudio(response);
    finishResponse(response);
    return;
  }

  if (!response.cancelled) {
    try {
      for (const part of content.modelTurn?.parts ?? []) {
        if (part.inlineData?.data) playAudioChunk(response, part.inlineData.data);
      }
    } catch (error) {
      failSpeech(response, error);
      return;
    }
  }

  if (content.turnComplete) {
    response.turnComplete = true;
    if (response.sources.size === 0) {
      if (response.cancelled || response.receivedAudio) {
        finishResponse(response);
      } else {
        failSpeech(response, new Error("A resposta do Google Live API não continha áudio."));
      }
    }
  }
}

function sendSpeech(session: Session, speech: ActiveSpeech) {
  if (speech.cancelled) return;
  if (responseSpeech) {
    queuedSpeech = speech;
    return;
  }

  responseSpeech = speech;
  speech.nextStartTime = 0;
  speech.turnComplete = false;
  speech.receivedAudio = false;
  try {
    session.sendClientContent({
      turns: [{ role: "user", parts: [{ text: speech.text }] }],
      turnComplete: true,
    });
  } catch (error) {
    failSpeech(speech, error);
  }
}

async function connectLiveSession() {
  const generation = sessionGeneration;
  const token = await createGoogleLiveToken();
  const { GoogleGenAI, Modality } = await import("@google/genai");
  let createdSession: Session | null = null;

  const session = await new GoogleGenAI({
    apiKey: token,
    httpOptions: { apiVersion: "v1alpha" },
  }).live.connect({
    model: GOOGLE_LIVE_MODEL,
    config: {
      ...GOOGLE_LIVE_CONFIG,
      responseModalities: [Modality.AUDIO],
    },
    callbacks: {
      onmessage: handleLiveMessage,
      onerror: (event) => {
        handleConnectionError(new Error(`Google Live API connection error (${event.type}).`));
      },
      onclose: (event) => {
        if (liveSession === createdSession) {
          liveSession = null;
          liveSessionPromise = null;
        }
        if (generation === sessionGeneration) {
          handleConnectionError(new Error(`Google Live API connection closed (${event.code}).`));
        }
      },
    },
  });

  if (generation !== sessionGeneration) {
    session.close();
    return session;
  }

  createdSession = session;
  liveSession = session;
  return session;
}

function handleConnectionError(error: Error) {
  const affected = new Set([responseSpeech, queuedSpeech, currentSpeech]);
  responseSpeech = null;
  queuedSpeech = null;
  for (const speech of affected) {
    if (!speech) continue;
    const shouldNotify = !speech.cancelled && currentSpeech === speech;
    if (shouldNotify) console.error("Google Live voice reading failed.", error);
    clearAudio(speech);
    speech.cancelled = true;
    if (currentSpeech === speech) currentSpeech = null;
    if (shouldNotify) speech.onEnded?.();
  }
}

function getLiveSession() {
  if (liveSession) return Promise.resolve(liveSession);
  if (!liveSessionPromise) {
    const pending = connectLiveSession();
    liveSessionPromise = pending;
    void pending.catch(() => {
      if (liveSessionPromise === pending) liveSessionPromise = null;
    });
  }
  return liveSessionPromise;
}

export function speakWithGoogleLive(text: string, onEnded?: () => void) {
  if (typeof window === "undefined" || !text.trim()) return () => {};

  const previousSpeech = currentSpeech;
  if (previousSpeech) {
    previousSpeech.cancelled = true;
    clearAudio(previousSpeech);
    if (queuedSpeech === previousSpeech) queuedSpeech = null;
  }

  const speech: ActiveSpeech = {
    cancelled: false,
    onEnded,
    text,
    sources: new Set(),
    nextStartTime: 0,
    turnComplete: false,
    receivedAudio: false,
  };
  currentSpeech = speech;

  if (responseSpeech === previousSpeech && previousSpeech?.turnComplete) {
    finishResponse(previousSpeech);
  }

  try {
    const context = getAudioContext();
    const resume = unlockGoogleLiveAudio();

    void resume
      .then(async () => {
        const session = await getLiveSession();
        if (speech.cancelled) return;
        sendSpeech(session, speech);
      })
      .catch((error: unknown) => failSpeech(speech, error));
  } catch (error) {
    failSpeech(speech, error);
  }

  return () => {
    if (speech.cancelled) return;
    speech.cancelled = true;
    clearAudio(speech);
    if (currentSpeech === speech) currentSpeech = null;
  };
}

export function stopGoogleLiveSpeech() {
  sessionGeneration += 1;
  if (currentSpeech) {
    currentSpeech.cancelled = true;
    clearAudio(currentSpeech);
    currentSpeech = null;
  }
  if (queuedSpeech) queuedSpeech.cancelled = true;
  if (responseSpeech) {
    responseSpeech.cancelled = true;
    clearAudio(responseSpeech);
  }
  queuedSpeech = null;
  responseSpeech = null;

  liveSession?.close();
  liveSession = null;
  liveSessionPromise = null;
}
