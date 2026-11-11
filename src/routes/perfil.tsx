import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Type, Contrast, Camera, CheckCircle2, XCircle, Clock3, TrendingUp, ImagePlus, UserRound, Volume2, Pencil, Check, X } from "lucide-react";
import { Shell } from "@/components/Shell";
import { speak, useProgress, getProfileStats, getAchievements, LESSONS, type ProfileStats } from "@/lib/app";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Beabá" },
      { name: "description", content: "Seu perfil, acessibilidade e evolução na leitura." },
      { property: "og:title", content: "Beabá — Meu Perfil" },
      { property: "og:description", content: "Acompanhe sua evolução na leitura." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Perfil,
});

const AVATARS = ["🦉", "🐻", "🐱", "🦋", "🐸", "🐰"];
const PHOTO_KEY = "beaba-profile-photo";
const AVATAR_KEY = "beaba-profile-avatar";
const CONTRAST_KEY = "beaba-high-contrast";
const PROFILE_NAME_KEY = "beaba-profile-name";

function Perfil() {
  const [big, setBig] = useState(false);
  const [contrast, setContrast] = useState(false);
  const [avatar, setAvatar] = useState("🦉");
  const [photo, setPhoto] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("Maria");
  const [nameDraft, setNameDraft] = useState("Maria");
  const [editingName, setEditingName] = useState(false);
  const [stats, setStats] = useState<ProfileStats>({ correct: 0, errors: 0, lastLesson: "", lastAt: null });
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const { done } = useProgress();

  useEffect(() => {
    try {
      setBig(window.localStorage.getItem("beaba-large-text") === "true");
      setContrast(window.localStorage.getItem(CONTRAST_KEY) === "true");
      setAvatar(window.localStorage.getItem(AVATAR_KEY) || "🦉");
      setPhoto(window.localStorage.getItem(PHOTO_KEY));
      const savedName = window.localStorage.getItem(PROFILE_NAME_KEY) || "Maria";
      setProfileName(savedName);
      setNameDraft(savedName);
      setStats(getProfileStats());
    } catch {
      // Keep default profile settings if browser storage is unavailable.
    } finally {
      setPreferenceLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!preferenceLoaded) return;
    try { window.localStorage.setItem("beaba-large-text", String(big)); } catch { /* local preference may be unavailable */ }
    document.documentElement.style.fontSize = big ? "24px" : "";
  }, [big, preferenceLoaded]);

  useEffect(() => {
    if (!preferenceLoaded) return;
    document.documentElement.classList.toggle("beaba-high-contrast", contrast);
    try { window.localStorage.setItem(CONTRAST_KEY, String(contrast)); } catch { /* local preference may be unavailable */ }
  }, [contrast, preferenceLoaded]);

  const totalAnswers = stats.correct + stats.errors;
  const accuracy = totalAnswers ? Math.round((stats.correct / totalAnswers) * 100) : 0;
  const taskProgress = LESSONS.length ? Math.round((done.length / LESSONS.length) * 100) : 0;
  const achievements = getAchievements(done, stats);
  const unlockedAchievements = achievements.filter((item) => item.unlocked).length;

  const chooseAvatar = (value: string) => {
    setAvatar(value);
    setPhoto(null);
    try {
      window.localStorage.setItem(AVATAR_KEY, value);
      window.localStorage.removeItem(PHOTO_KEY);
    } catch {
      setPhotoError("Não foi possível salvar a escolha neste navegador.");
    }
    speak("Avatar atualizado.");
  };

  const handlePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoError("");
    if (!file.type.startsWith("image/")) {
      setPhotoError("Escolha um arquivo de imagem.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setPhotoError("A imagem deve ter no máximo 8 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setPhotoError("Não foi possível abrir essa imagem.");
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => setPhotoError("Não foi possível processar essa imagem.");
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 480;
        const scale = Math.min(1, max / Math.max(image.width, image.height));
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          setPhotoError("Seu navegador não conseguiu preparar a imagem.");
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL("image/jpeg", 0.78);
        try {
          window.localStorage.setItem(PHOTO_KEY, data);
          window.localStorage.removeItem(AVATAR_KEY);
          setPhoto(data);
          speak("Foto de perfil atualizada.");
        } catch {
          setPhotoError("A imagem ficou grande demais para o armazenamento do navegador. Tente outra foto.");
        }
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const lastDate = useMemo(() => {
    if (!stats.lastAt) return "Ainda não há atividades recentes";
    const date = new Date(stats.lastAt);
    if (Number.isNaN(date.getTime())) return "Ainda não há atividades recentes";
    return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  }, [stats.lastAt]);

  return (
    <Shell home>
      <section className="person-heading flex min-w-0 flex-col items-center gap-3" data-speak="Meu perfil. Aqui você pode personalizar sua foto, acompanhar seu progresso e ajustar a acessibilidade.">
        <div className="relative">
          {photo ? (
            <img src={photo} alt="Sua foto de perfil" className="h-36 w-36 rounded-full border-4 border-[var(--home-header)] object-cover shadow-[0_8px_20px_rgb(0_0_0/0.12)]" />
          ) : (
            <div className="flex h-36 w-36 items-center justify-center rounded-full border-4 border-[var(--home-header)] bg-[var(--home-tag)] text-7xl shadow-[0_8px_20px_rgb(0_0_0/0.12)]" role="img" aria-label="Avatar escolhido">{avatar}</div>
          )}
        </div>
        {editingName ? (
          <div className="flex w-full max-w-sm items-center gap-2">
            <input
              autoFocus
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  const nextName = nameDraft.trim();
                  if (nextName) {
                    setProfileName(nextName);
                    try { window.localStorage.setItem(PROFILE_NAME_KEY, nextName); } catch { /* Keep name for this session. */ }
                    setEditingName(false);
                    speak(`Seu nome foi atualizado para ${nextName}.`);
                  }
                }
                if (event.key === "Escape") { setNameDraft(profileName); setEditingName(false); }
              }}
              maxLength={40}
              aria-label="Seu nome"
              className="min-w-0 flex-1 rounded-xl border-2 border-[var(--b-blue)] bg-white px-3 py-2 text-center text-2xl font-extrabold text-[var(--home-navy)] outline-none focus:ring-2 focus:ring-[var(--b-green)]"
            />
            <button
              type="button"
              onClick={() => {
                const nextName = nameDraft.trim();
                if (!nextName) { speak("Digite um nome antes de salvar."); return; }
                setProfileName(nextName);
                try { window.localStorage.setItem(PROFILE_NAME_KEY, nextName); } catch { /* Keep name for this session. */ }
                setEditingName(false);
                speak(`Seu nome foi atualizado para ${nextName}.`);
              }}
              aria-label="Salvar nome"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--b-green)] text-white"
            ><Check className="h-6 w-6" /></button>
            <button
              type="button"
              onClick={() => { setNameDraft(profileName); setEditingName(false); }}
              aria-label="Cancelar edição do nome"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--home-tag)] text-[var(--home-navy)]"
            ><X className="h-6 w-6" /></button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-4xl font-extrabold text-[var(--home-navy)]">{profileName}</h1>
            <button
              type="button"
              onClick={() => { setNameDraft(profileName); setEditingName(true); }}
              aria-label="Editar nome do perfil"
              title="Editar nome"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--b-blue)] text-white shadow-sm transition active:scale-95"
            ><Pencil className="h-5 w-5" /></button>
          </div>
        )}
        <p className="font-display text-lg font-bold text-[var(--home-navy)]">Meu espaço de aprendizagem</p>
      </section>

      <section className="mt-8 w-full rounded-[2rem] bg-[var(--home-nav)] p-5 shadow-[0_8px_20px_rgb(0_0_0/0.07)]">
        <h2 className="mb-4 flex items-center gap-3 font-display text-2xl font-extrabold text-[var(--home-navy)]"><UserRound className="h-7 w-7" /> Minha aparência <button type="button" onClick={() => speak("Minha aparência. Escolha um personagem ou importe sua fotografia.")} aria-label="Ouvir sobre minha aparência" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--b-blue)] text-white"><Volume2 className="h-6 w-6" /></button></h2>
        <p className="mb-3 font-bold text-[var(--home-navy)]">Escolha um personagem</p>
        <div className="grid grid-cols-6 gap-2">
          {AVATARS.map((item) => (
            <button key={item} type="button" onClick={() => chooseAvatar(item)} aria-label={`Escolher avatar ${item}`} aria-pressed={!photo && avatar === item}
              className={`flex aspect-square items-center justify-center rounded-2xl border-2 text-3xl transition active:scale-95 ${!photo && avatar === item ? "border-[var(--b-green)] bg-[var(--b-green)]/15 ring-2 ring-[var(--b-green)]" : "border-transparent bg-[var(--home-tag)]"}`}>
              {item}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl bg-[var(--b-blue)] px-4 py-4 font-display text-lg font-extrabold text-white shadow-sm transition active:scale-[0.98]">
            <ImagePlus className="h-7 w-7" /> Importar fotografia
            <input type="file" accept="image/*" onChange={handlePhoto} className="sr-only" />
          </label>
          <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-[var(--b-blue)] bg-white px-4 py-4 font-display text-lg font-extrabold text-[var(--home-navy)] shadow-sm transition active:scale-[0.98]">
            <Camera className="h-7 w-7" /> Tirar foto agora
            <input type="file" accept="image/*" capture="user" onChange={handlePhoto} className="sr-only" />
          </label>
        </div>
        {photoError && <p role="alert" className="mt-2 text-sm font-bold text-red-700">{photoError}</p>}
        <p className="mt-2 text-center text-sm text-[var(--home-navy)]/75">A foto fica salva neste navegador, sem ser enviada para a internet.</p>
      </section>

      <section className="mt-6 w-full rounded-[2rem] bg-[var(--home-nav)] p-5 shadow-[0_8px_20px_rgb(0_0_0/0.07)]">
        <h2 className="mb-4 flex items-center gap-3 font-display text-2xl font-extrabold text-[var(--home-navy)]">Meu progresso <button type="button" onClick={() => speak("Meu progresso. Aqui você acompanha suas atividades concluídas, acertos, tentativas incorretas e sua evolução.")} aria-label="Ouvir sobre meu progresso" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--b-blue)] text-white"><Volume2 className="h-6 w-6" /></button></h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[var(--home-tag)] p-4">
            <CheckCircle2 className="mb-2 h-8 w-8 text-[var(--b-green)]" />
            <p className="flex items-center gap-2 font-display text-3xl font-extrabold text-[var(--home-navy)]">{done.length}/{LESSONS.length}<button type="button" onClick={() => speak(`Você concluiu ${done.length} de ${LESSONS.length} atividades.`)} aria-label="Ouvir atividades concluídas" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--b-blue)] text-white"><Volume2 className="h-5 w-5" /></button></p>
            <p className="font-bold text-[var(--home-navy)]">Atividades concluídas</p>
          </div>
          <div className="rounded-2xl bg-[var(--home-tag)] p-4">
            <CheckCircle2 className="mb-2 h-8 w-8 text-[var(--b-green)]" />
            <p className="flex items-center gap-2 font-display text-3xl font-extrabold text-[var(--home-navy)]">{stats.correct}<button type="button" onClick={() => speak(`Você marcou ${stats.correct} respostas corretamente.`)} aria-label="Ouvir quantidade de acertos" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--b-blue)] text-white"><Volume2 className="h-5 w-5" /></button></p>
            <p className="font-bold text-[var(--home-navy)]">Acertos</p>
          </div>
          <div className="rounded-2xl bg-[var(--home-tag)] p-4">
            <XCircle className="mb-2 h-8 w-8 text-[var(--b-red)]" />
            <p className="flex items-center gap-2 font-display text-3xl font-extrabold text-[var(--home-navy)]">{stats.errors}<button type="button" onClick={() => speak(`Você tem ${stats.errors} respostas para corrigir. Quando acertar uma questão novamente, ela sairá dos erros e passará para os acertos.`)} aria-label="Ouvir quantidade de erros" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--b-blue)] text-white"><Volume2 className="h-5 w-5" /></button></p>
            <p className="font-bold text-[var(--home-navy)]">Tentativas incorretas</p>
          </div>
          <div className="rounded-2xl bg-[var(--home-tag)] p-4">
            <Clock3 className="mb-2 h-8 w-8 text-[var(--b-blue)]" />
            <p className="flex items-center gap-2 font-display text-lg font-extrabold text-[var(--home-navy)]">{stats.lastLesson || "Nenhuma ainda"}<button type="button" onClick={() => speak(stats.lastLesson ? `Sua última atividade foi ${stats.lastLesson}, em ${lastDate}.` : "Você ainda não iniciou nenhuma atividade.")} aria-label="Ouvir última atividade" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--b-blue)] text-white"><Volume2 className="h-5 w-5" /></button></p>
            <p className="mt-1 text-sm font-bold text-[var(--home-navy)]">{lastDate}</p>
            <p className="font-bold text-[var(--home-navy)]">Última atividade</p>
          </div>
        </div>
        <div className="mt-5 rounded-2xl bg-[var(--home-tag)] p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-display text-lg font-extrabold text-[var(--home-navy)]"><TrendingUp className="h-6 w-6" /> Evolução <button type="button" onClick={() => speak(`Sua evolução: ${done.length} de ${LESSONS.length} atividades concluídas. Aproveitamento nas respostas: ${accuracy} por cento.`)} aria-label="Ouvir evolução" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--b-blue)] text-white"><Volume2 className="h-5 w-5" /></button></p>
            <span className="font-display text-xl font-extrabold text-[var(--home-navy)]">{taskProgress}%</span>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-white" role="progressbar" aria-label="Atividades concluídas" aria-valuenow={taskProgress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-[var(--b-blue)] transition-all duration-500" style={{ width: `${taskProgress}%` }} />
          </div>
          <p className="mt-3 flex items-center gap-2 font-bold text-[var(--home-navy)]">Aproveitamento nas respostas: {accuracy}% <button type="button" onClick={() => speak(`Seu aproveitamento nas respostas é de ${accuracy} por cento.`)} aria-label="Ouvir aproveitamento" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--b-blue)] text-white"><Volume2 className="h-5 w-5" /></button></p>
          <p className="mt-1 text-sm text-[var(--home-navy)]">{totalAnswers ? "Cada tentativa é uma oportunidade de aprender. Continue praticando!" : "Faça sua primeira atividade para começar a acompanhar seus acertos e sua evolução."}</p>
        </div>
      </section>

      <section className="mt-6 w-full rounded-[2rem] bg-[var(--home-nav)] p-5 shadow-[0_8px_20px_rgb(0_0_0/0.07)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-[var(--home-navy)]">Minhas conquistas</h2>
            <p className="font-bold text-[var(--home-navy)]">{unlockedAchievements} de {achievements.length} medalhas conquistadas</p>
          </div>
          <button type="button" onClick={() => speak(`Minhas conquistas. Você desbloqueou ${unlockedAchievements} de ${achievements.length} medalhas.`)} aria-label="Ouvir sobre minhas conquistas" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--b-blue)] text-white"><Volume2 className="h-6 w-6" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {achievements.map((item) => (
            <article key={item.id} className={`rounded-2xl p-4 text-center ${item.unlocked ? "bg-[var(--home-tag)]" : "bg-[var(--home-tag)]/55 opacity-65"}`}>
              <span className="text-4xl" aria-hidden>{item.unlocked ? item.icon : "🔒"}</span>
              <h3 className="mt-2 font-display text-lg font-extrabold text-[var(--home-navy)]">{item.title}</h3>
              <p className="mt-1 text-sm font-bold text-[var(--home-navy)]">{item.description}</p>
              <p className="mt-2 text-xs font-extrabold uppercase text-[var(--home-navy)]">{item.unlocked ? "Conquistada" : "Ainda não conquistada"}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="profile-settings mt-6 grid min-w-0 grid-cols-1 gap-3">
        <h2 className="flex items-center gap-3 px-1 font-display text-2xl font-extrabold text-[var(--home-navy)]">Acessibilidade <button type="button" onClick={() => speak("Acessibilidade. Aqui você pode aumentar o tamanho do texto e ativar o contraste reforçado.")} aria-label="Ouvir sobre acessibilidade" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--b-blue)] text-white"><Volume2 className="h-6 w-6" /></button></h2>
        <button type="button" onClick={() => { setBig((value) => !value); speak(big ? "Letra normal" : "Letra grande"); }} aria-pressed={big} aria-label="Aumentar tamanho do texto"
          className={`flex items-center gap-4 rounded-[2rem] p-5 text-left font-display text-xl font-bold shadow-[0_8px_18px_rgb(0_0_0/0.08)] active:scale-[0.98] ${big ? "bg-[var(--b-green)] text-white" : "bg-[var(--home-nav)] text-[var(--home-navy)]"}`}>
          <Type className="h-10 w-10 shrink-0" strokeWidth={2.5} /><span className="flex-1">Aumentar texto</span><span className="text-sm">{big ? "Ativado" : "Desativado"}</span>
        </button>
        <button type="button" onClick={() => { setContrast((value) => !value); speak(contrast ? "Contraste normal" : "Contraste reforçado ativado"); }} aria-pressed={contrast} aria-label="Ativar contraste reforçado"
          className={`flex items-center gap-4 rounded-[2rem] p-5 text-left font-display text-xl font-bold shadow-[0_8px_18px_rgb(0_0_0/0.08)] active:scale-[0.98] ${contrast ? "bg-[var(--b-green)] text-white" : "bg-[var(--home-nav)] text-[var(--home-navy)]"}`}>
          <Contrast className="h-10 w-10 shrink-0" strokeWidth={2.5} /><span className="flex-1">Contraste reforçado</span><span className="text-sm">{contrast ? "Ativado" : "Desativado"}</span>
        </button>
      </section>
    </Shell>
  );
}
