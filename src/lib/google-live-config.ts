export const GOOGLE_LIVE_MODEL = "gemini-3.8-live";

export const GOOGLE_LIVE_CONFIG = {
  responseModalities: ["AUDIO"],
  speechConfig: {
    languageCode: "pt-BR",
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName: "Kore",
      },
    },
  },
  systemInstruction: {
    parts: [
      {
        text: "Leia em voz alta, exatamente como foi escrito, todo texto enviado pelo usuário. Use português brasileiro, com fala clara, calma e pausada. Não acrescente, remova, explique ou reformule nenhuma palavra.",
      },
    ],
  },
};
