import { createServerFn } from "@tanstack/react-start";
import { GOOGLE_LIVE_CONFIG, GOOGLE_LIVE_MODEL } from "./google-live-config";

export const createGoogleLiveToken = createServerFn({ method: "POST" }).handler(async () => {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    throw new Error("A variável GEMINI_API_KEY não está configurada no servidor.");
  }

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      uses: 1,
      expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(),
      bidiGenerateContentSetup: {
        model: `models/${GOOGLE_LIVE_MODEL}`,
        generationConfig: {
          responseModalities: GOOGLE_LIVE_CONFIG.responseModalities,
          speechConfig: GOOGLE_LIVE_CONFIG.speechConfig,
        },
        systemInstruction: GOOGLE_LIVE_CONFIG.systemInstruction,
      },
    }),
  });

  if (!response.ok) {
    console.error(`Google Live token request failed with status ${response.status}.`);
    throw new Error("Não foi possível iniciar a leitura por voz.");
  }

  const token = (await response.json()) as { name?: unknown };
  if (typeof token.name !== "string") {
    throw new Error("O Google Live API não retornou um token de sessão válido.");
  }

  return token.name;
});
