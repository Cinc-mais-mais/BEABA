import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("Defina GEMINI_API_KEY no ambiente antes de gerar os áudios.");
}

const outputDir = join(process.cwd(), "public", "audio", "tutorial");
await mkdir(outputDir, { recursive: true });

const entries = [
  ["selection-learn", "Você está no Beabá. Aperte aqui para aprender a usar o aplicativo."],
  ["selection-skip", "Se você já sabe utilizar o app, aperte aqui para pular o tutorial."],
  ["home-introduction", "Aqui é a tela inicial, onde você fará as atividades."],
  ["continue-activity", "Você pode apertar neste botão para começar a aprender sempre que quiser. Aperte nele agora para fazermos a sua primeira atividade."],
  ["activity-introduction", "Aqui na atividade, você vai ver um desenho e uma palavra incompleta desse desenho. Seu objetivo é completar a palavra com o que estiver faltando."],
  ["picture-audio", "Você pode clicar no quadrado com o desenho para ouvir a palavra de novo."],
  ["choose-answer", "Sua vez. Aperte no que está faltando para completar a palavra."],
  ["next-word", "Aperte aqui em prosseguir para ir para a próxima palavra!"],
  ["trail-completed", "Muito bem! Você concluiu a atividade Vogais. Veja: a primeira bolinha está completa e a próxima atividade foi desbloqueada."],
  ["large-text-guide", "Este é o botão para aumentar o tamanho do texto. Clique nele para ver as letras maiores. Para voltar ao tamanho normal, é só apertar novamente."],
  ["missing-part-abelha", "A palavra é abelha."],
  ["missing-part-ovo", "A palavra é ovo."],
  ["missing-part-uva", "A palavra é uva."],
  ["picture-repeat-abelha", "Abelha."],
  ["picture-repeat-ovo", "Ovo."],
  ["picture-repeat-uva", "Uva."],
  ["correct-answer-abelha", "Parabéns! Você montou a palavra abelha! Vamos para a próxima palavra?"],
  ["correct-answer-ovo", "Parabéns! Você montou a palavra ovo! Vamos para a próxima palavra?"],
  ["correct-answer-uva", "Parabéns! Você montou a palavra uva! Vamos para a próxima palavra?"],
];

// O limite gratuito informado pela API foi de 3 requisições/minuto.
// Usamos 22 segundos entre chamadas para deixar margem para a janela móvel.
const MIN_REQUEST_INTERVAL_MS = 22_000;
const MAX_RETRIES = 6;
const MAX_AUTOMATIC_RETRY_DELAY_MS = 120_000;
let lastRequestAt = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForRequestSlot() {
  if (!lastRequestAt) return;
  const elapsed = Date.now() - lastRequestAt;
  const remaining = MIN_REQUEST_INTERVAL_MS - elapsed;
  if (remaining > 0) {
    console.log(`Aguardando ${Math.ceil(remaining / 1000)}s para respeitar a cota do Gemini...`);
    await sleep(remaining);
  }
}

async function isValidWav(filePath) {
  try {
    const [info, header] = await Promise.all([
      stat(filePath),
      readFile(filePath, { encoding: null, flag: "r" }),
    ]);
    return info.size > 44 && header.toString("ascii", 0, 4) === "RIFF" && header.toString("ascii", 8, 12) === "WAVE";
  } catch {
    return false;
  }
}

function getRetryDelayMs(payload) {
  const retryInfo = payload?.error?.details?.find((detail) =>
    typeof detail?.["@type"] === "string" && detail["@type"].endsWith("RetryInfo"),
  );
  const value = retryInfo?.retryDelay;
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d+(?:\.\d+)?)s$/);
  return match ? Math.ceil(Number(match[1]) * 1000) : null;
}

function wavHeader(pcmLength, sampleRate = 24000, channels = 1, bitDepth = 16) {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * bitDepth / 8;
  const blockAlign = channels * bitDepth / 8;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmLength, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmLength, 40);
  return header;
}

function formatDuration(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    hours ? `${hours}h` : "",
    minutes ? `${minutes}min` : "",
    seconds && !hours ? `${seconds}s` : "",
  ].filter(Boolean).join(" ");
}

async function generateAudio(id, transcript) {
  const filePath = join(outputDir, `${id}.wav`);
  if (await isValidWav(filePath)) {
    console.log(`Já existe, ignorando: ${filePath}`);
    return "skipped";
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    await waitForRequestSlot();
    lastRequestAt = Date.now();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Leia exatamente o texto a seguir, em português brasileiro, com voz clara, acolhedora, calma e pausada, adequada a pessoas idosas: ${transcript}` }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
            },
          },
        }),
      },
    );

    if (!response.ok) {
      const details = await response.text();
      let payload;
      try {
        payload = JSON.parse(details);
      } catch {
        payload = null;
      }

      const retryDelayMs = getRetryDelayMs(payload);
      const transientServerError = [500, 502, 503, 504].includes(response.status);
      const retryableRateLimit = response.status === 429 && retryDelayMs !== null;

      if (retryableRateLimit && retryDelayMs > MAX_AUTOMATIC_RETRY_DELAY_MS) {
        const resumeAt = new Date(Date.now() + retryDelayMs);
        console.warn("");
        console.warn(`A cota do Gemini pediu uma espera de ${formatDuration(retryDelayMs)} para gerar "${id}".`);
        console.warn(`A geração foi pausada para não deixar o terminal aguardando por horas. Tente novamente após ${resumeAt.toLocaleString("pt-BR")}.`);
        console.warn("Os WAVs já gerados foram preservados. Execute o mesmo comando novamente para continuar.");
        return "paused";
      }

      if (attempt < MAX_RETRIES && (retryableRateLimit || transientServerError)) {
        const delay = Math.max(retryDelayMs ?? 0, MIN_REQUEST_INTERVAL_MS) + 1500;
        console.warn(`Limite/instabilidade ao gerar ${id}. Nova tentativa em ${formatDuration(delay)} (tentativa ${attempt + 1}/${MAX_RETRIES}).`);
        await sleep(delay);
        continue;
      }

      throw new Error(`Falha ao gerar ${id} (${response.status}): ${details}`);
    }

    const json = await response.json();
    const data = json.candidates?.[0]?.content?.parts?.find((part) => part.inlineData)?.inlineData?.data;
    if (!data) {
      throw new Error(`O Gemini não retornou áudio para ${id}.`);
    }

    const pcm = Buffer.from(data, "base64");
    if (pcm.length === 0) {
      throw new Error(`O Gemini retornou áudio vazio para ${id}.`);
    }
    await writeFile(filePath, Buffer.concat([wavHeader(pcm.length), pcm]));
    console.log(`Gerado: ${filePath}`);
    return "generated";
  }

  throw new Error(`Não foi possível gerar ${id} após ${MAX_RETRIES} tentativas.`);
}

let generated = 0;
let skipped = 0;
let pausedAt = null;
for (const [id, transcript] of entries) {
  const result = await generateAudio(id, transcript);
  if (result === "generated") generated++;
  else if (result === "skipped") skipped++;
  else if (result === "paused") {
    pausedAt = id;
    break;
  }
}

const completed = generated + skipped;
console.log(`\nProgresso: ${completed}/${entries.length} arquivo(s) prontos (${generated} novo(s), ${skipped} já existente(s)).`);
if (pausedAt) {
  console.log(`Faltam ${entries.length - completed} arquivo(s), começando por "${pausedAt}". Execute novamente após o horário indicado acima.`);
} else {
  console.log("Todos os áudios foram gerados. Revise os arquivos antes de adicioná-los ao repositório.");
}
