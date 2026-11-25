import { mkdir, writeFile } from "node:fs/promises";
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

for (const [id, transcript] of entries) {
  const filePath = join(outputDir, `${id}.wav`);
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
    throw new Error(`Falha ao gerar ${id} (${response.status}): ${details}`);
  }

  const json = await response.json();
  const data = json.candidates?.[0]?.content?.parts?.find((part) => part.inlineData)?.inlineData?.data;
  if (!data) throw new Error(`O Gemini não retornou áudio para ${id}.`);

  const pcm = Buffer.from(data, "base64");
  await writeFile(filePath, Buffer.concat([wavHeader(pcm.length), pcm]));
  console.log(`Gerado: ${filePath}`);
}

console.log(`\n${entries.length} arquivos WAV gerados. Revise-os antes de adicioná-los ao repositório.`);
