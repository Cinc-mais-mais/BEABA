import { isSoundEnabled } from "@/lib/app";

/**
 * Configuração da primeira fase do tutorial.
 * Para substituir a voz provisória por gravações, basta preencher audioSrc
 * em cada fala com o caminho do respectivo arquivo de áudio.
 */
export const TUTORIAL_PHASE_ONE = {
  storageKey: "beaba-tutorial-phase-one-complete",
  lessonId: "vogais",
  questionIndex: 0,
  overviewDelayMs: 3000,
  narration: {
    welcome: {
      text: "Olá, você está no Beabá.",
      audioSrc: null as string | null,
    },
    welcomePrompt: {
      text: "Aperte neste botão para continuar.",
      audioSrc: null as string | null,
    },
    homeIntroduction: {
      text: "Aqui é a tela inicial, onde você fará as atividades.",
      audioSrc: null as string | null,
    },
    continueActivity: {
      text: "Você pode apertar neste botão para começar a aprender sempre que quiser. Aperte nele agora para fazermos a sua primeira atividade.",
      audioSrc: null as string | null,
    },
    activityIntroduction: {
      text: "Aqui na atividade, você vai ver um desenho e uma palavra incompleta desse desenho. Seu objetivo é completar a palavra com o que estiver faltando.",
      audioSrc: null as string | null,
    },
    missingPart: {
      text: "A palavra é \"{{word}}\".",
      audioSrc: null as string | null,
    },
    pictureAudio: {
      text: "Você pode clicar no quadrado com o desenho para ouvir a palavra de novo.",
      audioSrc: null as string | null,
    },
    chooseAnswer: {
      text: "Sua vez. Aperte no que está faltando para completar a palavra.",
      audioSrc: null as string | null,
    },
    correctAnswer: {
      text: "Parabéns! Você montou a palavra \"{{word}}\"! Vamos para a próxima palavra?",
      audioSrc: null as string | null,
    },
    nextWord: {
      text: "Aperte aqui em prosseguir para ir para a próxima palavra!",
      audioSrc: null as string | null,
    },
  },
} as const;

export type TutorialNarrationKey = keyof typeof TUTORIAL_PHASE_ONE.narration;

export function playTutorialNarration(
  key: TutorialNarrationKey,
  values: Record<string, string> = {},
  onEnded?: () => void,
): () => void {
  const clip = TUTORIAL_PHASE_ONE.narration[key];
  const text = Object.entries(values).reduce(
    (result, [name, value]) => result.replaceAll(`{{${name}}}`, value),
    clip.text,
  );
  let cancelled = false;
  let audio: HTMLAudioElement | null = null;
  let utterance: SpeechSynthesisUtterance | null = null;
  let fallbackTimer: number | null = null;

  const finish = () => {
    if (!cancelled) onEnded?.();
  };

  const useSpeechSynthesis = () => {
    if (cancelled) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      finish();
      return;
    }
    window.speechSynthesis.cancel();
    utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = 0.84;
    utterance.pitch = 1;
    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
  };

  if (typeof window === "undefined") {
    onEnded?.();
  } else if (!isSoundEnabled()) {
    fallbackTimer = window.setTimeout(finish, 0);
  } else if (clip.audioSrc) {
    audio = new Audio(clip.audioSrc);
    audio.onended = finish;
    audio.onerror = useSpeechSynthesis;
    void audio.play().catch(useSpeechSynthesis);
  } else {
    useSpeechSynthesis();
  }

  return () => {
    cancelled = true;
    if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.onended = null;
      audio.onerror = null;
    }
    if (utterance) {
      utterance.onend = null;
      utterance.onerror = null;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    }
  };
}
