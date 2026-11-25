# Gravações manuais de voz — BEABÁ

O player central tenta primeiro o arquivo MP3 em `public/audio/voice/`, usando o nome de arquivo derivado da mensagem completa:

- texto em minúsculas, normalizado sem acentos;
- caracteres não alfanuméricos viram hífen;
- máximo de 120 caracteres.

Exemplo: `"Texto ampliado ativado."` → `texto-ampliado-ativado.mp3`.

**Formato recomendado:** MP3, mono, 44,1 kHz, 96–128 kb/s para fala.  
**Não remova os textos nem altere a sequência das interações para ajustar gravações.**

O fallback de voz antiga permanece ativo durante a migração para que gravações ausentes não interrompam o app. Tutorial com arquivos nomeados individualmente continua compatível com WAV enquanto os MP3s são substituídos.

## Migração

1. Adicione as gravações MP3 em `public/audio/voice/` com o nome calculado acima.
2. O player tenta reproduzir a gravação local; caso esteja ausente ou falhe, usa a voz de fallback atual.
3. Depois de verificar a cobertura de todas as leituras, a camada de fallback poderá ser removida numa etapa separada.

A lista completa de mensagens e variantes dinâmicas precisa ser validada nas telas e em teste de uso; não se deve remover a voz de fallback antes dessa validação.
