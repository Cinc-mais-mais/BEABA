# Áudios pré-gravados do tutorial

Os arquivos de voz usados no tutorial são gerados uma única vez com Gemini TTS e depois reproduzidos como arquivos WAV estáticos. O app não chama o Gemini Live para essas falas quando os arquivos existem.

## Gerar os arquivos localmente

1. Crie ou copie uma chave de API do Google AI Studio com acesso ao Gemini API.
2. Configure a chave no terminal local, sem colocá-la no código ou no repositório.

### Windows PowerShell

```powershell
$env:GEMINI_API_KEY="SUA_CHAVE"
bun run audio:generate
```

### macOS/Linux

```bash
export GEMINI_API_KEY="SUA_CHAVE"
bun run audio:generate
```

O script faz chamadas ao modelo `gemini-2.5-flash-preview-tts`, transforma o PCM retornado em WAV (24 kHz, mono, 16-bit) e grava os arquivos em `public/audio/tutorial/`. Para respeitar a cota gratuita observada de 3 solicitações por minuto, ele espera pelo menos 22 segundos entre chamadas, interpreta o `retryDelay` de respostas 429 e tenta novamente automaticamente. Também ignora WAVs já existentes e válidos, permitindo interromper e executar o comando novamente sem regenerar os arquivos concluídos.

3. Ouça e revise os WAVs gerados.
4. Adicione a pasta `public/audio/tutorial/` ao Git, commit e push para `main`. Os arquivos serão servidos como recursos estáticos pela Vercel.
5. A chave usada para a geração local não é necessária para reproduzir os arquivos no app. Não a adicione ao Git.

O script gera os textos fixos da tela inicial e da sequência guiada, além das variantes para as três palavras da primeira atividade (abelha, ovo e uva). Se a geração parar por limite de cota, execute `bun run audio:generate` novamente mais tarde: os arquivos válidos existentes serão preservados e apenas os faltantes serão gerados. Se os arquivos não existirem, a reprodução ainda pode recorrer ao Gemini Live como fallback.
