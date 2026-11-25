import { isSoundEnabled, speak } from "@/lib/app";\nimport { playAudioFile, playAudioText } from "@/lib/audio";

/** Configuração da primeira fase do tutorial e caminhos dos áudios gravados. */
export const TUTORIAL_PHASE_ONE = {
  storageKey: "beaba-tutorial-complete-v2",
  instructionsSeenStorageKey: "beaba-tutorial-instructions-seen",
  lessonId: "vogais",
  questionIndex: 0,
  overviewDelayMs: 3000,
  narration: {
    selectionLearn: {
      text: "Você está no Beabá. Aperte aqui para aprender a usar o aplicativo.",
      audioSrc: "/audio/tutorial/selection-learn.wav" as string | null,
    },
    selectionSkip: {
      text: "Se você já sabe utilizar o app, aperte aqui para pular o tutorial.",
      audioSrc: "/audio/tutorial/selection-skip.wav" as string | null,
    },
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
      audioSrc: "/audio/tutorial/home-introduction.wav" as string | null,
    },
    continueActivity: {
      text: "Você pode apertar neste botão para começar a aprender sempre que quiser. Aperte nele agora para fazermos a sua primeira atividade.",
      audioSrc: "/audio/tutorial/continue-activity.wav" as string | null,
    },
    activityIntroduction: {
      text: "Aqui na atividade, você vai ver um desenho e uma palavra incompleta desse desenho. Seu objetivo é completar a palavra com o que estiver faltando.",
      audioSrc: "/audio/tutorial/activity-introduction.wav" as string | null,
    },
    missingPart: {
      text: "A palavra é \"{{word}}\".",
      audioSrc: null as string | null,
    },
    pictureAudio: {
      text: "Você pode clicar no quadrado com o desenho para ouvir a palavra de novo.",
      audioSrc: "/audio/tutorial/picture-audio.wav" as string | null,
    },
    pictureRepeat: {
      text: "{{word}}.",
      audioSrc: null as string | null,
    },
    chooseAnswer: {
      text: "Sua vez. Aperte no que está faltando para completar a palavra.",
      audioSrc: "/audio/tutorial/choose-answer.wav" as string | null,
    },
    correctAnswer: {
      text: "Parabéns! Você montou a palavra \"{{word}}\"! Vamos para a próxima palavra?",
      audioSrc: null as string | null,
    },
    nextWord: {
      text: "Aperte aqui em prosseguir para ir para a próxima palavra!",
      audioSrc: "/audio/tutorial/next-word.wav" as string | null,
    },
    trailCompleted: {
      text: "Muito bem! Você concluiu a atividade Vogais. Veja: a primeira bolinha está completa e a próxima atividade foi desbloqueada.",
      audioSrc: "/audio/tutorial/trail-completed.wav" as string | null,
    },
    largeTextGuide: {
      text: "Este é o botão para aumentar o tamanho do texto. Clique nele para ver as letras maiores. Para voltar ao tamanho normal, é só apertar novamente.",
      audioSrc: "/audio/tutorial/large-text-guide.wav" as string | null,
    },
  },
} as const;

export type TutorialNarrationKey = keyof typeof TUTORIAL_PHASE_ONE.narration;

function resolveAudioSrc(key: TutorialNarrationKey, values: Record<string, string>, fallback: string | null) {
  const word = values.word?.trim().toLocaleLowerCase("pt-BR");
  if (word && ["missingPart", "pictureRepeat", "correctAnswer"].includes(key)) {
    const fileKey = key.replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase());
    return `/audio/tutorial/${fileKey}-${word}.wav`;
  }
  return fallback;
}

export function playTutorialNarration(
  key: TutorialNarrationKey,
  values: Record<string, string> = {},
  onEnded?: () => void,
): () => void {
  const clip = TUTORIAL_PHASE_ONE.narration[key];
  const legacyAudioSrc = resolveAudioSrc(key, values, clip.audioSrc);
  const text = Object.entries(values).reduce<string>(
    (result, [name, value]) => result.replaceAll(`{{${name}}}`, value),
    clip.text,
  );

  if (typeof window === "undefined") {
    onEnded?.();
    return () => {};
  }
  if (!isSoundEnabled()) {
    const timer = window.setTimeout(() => onEnded?.(), 0);
    return () => window.clearTimeout(timer);
  }

  return playAudioText(text, onEnded, () => {
    if (legacyAudioSrc) {
      return playAudioFile(legacyAudioSrc, onEnded, () => speak(text, onEnded));
    }
    return speak(text, onEnded);
  });
}
