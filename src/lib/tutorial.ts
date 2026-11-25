import { isSoundEnabled, speak } from "@/lib/app";

/**
 * Configuração da primeira fase do tutorial.
 * A voz usa o Google Live API; audioSrc pode substituir uma fala por uma gravação.
 */
export const TUTORIAL_PHASE_ONE = {
  storageKey: "beaba-tutorial-complete-v2",
  instructionsSeenStorageKey: "beaba-tutorial-instructions-seen",
  lessonId: "vogais",
  questionIndex: 0,
  overviewDelayMs: 3000,
  narration: {
    welcome: {
      text: "Olá, clique em Ouvir instruções caso precise de ajuda, ou clique em Iniciar caso queira pular as instruções.",
      audioSrc: null as string | null,
    },
    welcomeReturning: {
      text: "Olá, seja bem-vindo ao Beabá. Clique em Ouvir instruções ou Iniciar.",
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
    pictureRepeat: {
      text: "{{word}}.",
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
    trailCompleted: {
      text: "Muito bem! Você concluiu a atividade Vogais. Veja: a primeira bolinha está completa e a próxima atividade foi desbloqueada.",
      audioSrc: null as string | null,
    },
    largeTextGuide: {
      text: "Este é o botão para aumentar o tamanho do texto. Clique nele para ver as letras maiores. Para voltar ao tamanho normal, é só apertar novamente.",
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
  const text = Object.entries(values).reduce<string>(
    (result, [name, value]) => result.replaceAll(`{{${name}}}`, value),
    clip.text,
  );
  let cancelled = false;
  let audio: HTMLAudioElement | null = null;
  let fallbackTimer: number | null = null;
  let speechStarted = false;
  let cancelSpeech = () => {};

  const finish = () => {
    if (!cancelled) onEnded?.();
  };

  const startGoogleLiveSpeech = () => {
    if (cancelled || speechStarted) return;
    speechStarted = true;
    cancelSpeech = speak(text, finish);
  };

  if (typeof window === "undefined") {
    onEnded?.();
  } else if (!isSoundEnabled()) {
    fallbackTimer = window.setTimeout(finish, 0);
  } else if (clip.audioSrc) {
    audio = new Audio(clip.audioSrc);
    audio.onended = finish;
    audio.onerror = startGoogleLiveSpeech;
    void audio.play().catch(startGoogleLiveSpeech);
  } else {
    startGoogleLiveSpeech();
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
    cancelSpeech();
  };
}
