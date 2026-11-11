import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpen, Search, Volume2 } from "lucide-react";
import { Shell } from "@/components/Shell";
import { speak, WORD_LIBRARY } from "@/lib/app";

export const Route = createFileRoute("/palavras")({
  head: () => ({ meta: [{ title: "Minhas palavras | Beabá" }, { name: "description", content: "Biblioteca de palavras organizada por categorias." }] }),
  component: Palavras,
});

function Palavras() {
  const [category, setCategory] = useState("Todas");
  const [search, setSearch] = useState("");
  const categories = useMemo(() => ["Todas", ...Array.from(new Set(WORD_LIBRARY.map((item) => item.category))).sort((a, b) => a.localeCompare(b, "pt-BR"))], []);
  const filtered = WORD_LIBRARY.filter((item) => (category === "Todas" || item.category === category) && item.word.includes(search.trim().toLocaleLowerCase("pt-BR")));
  return (
    <Shell home>
      <section className="w-full rounded-[2rem] bg-[var(--home-nav)] p-5 shadow-[0_8px_20px_rgb(0_0_0/0.07)]">
        <div className="mb-2 flex items-center gap-3">
          <BookOpen className="h-9 w-9 text-[var(--home-navy)]" />
          <h1 className="font-display text-3xl font-extrabold text-[var(--home-navy)]">Minhas palavras</h1>
        </div>
        <p className="mb-5 font-bold text-[var(--home-navy)]">Explore as palavras que você está aprendendo. Toque no alto-falante para ouvir.</p>
        <label className="mb-4 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-[var(--home-navy)]">
          <Search className="h-6 w-6 shrink-0" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Procurar uma palavra" aria-label="Procurar uma palavra" className="min-w-0 flex-1 bg-transparent text-lg font-bold outline-none placeholder:text-[var(--home-navy)]/55" />
        </label>
        <div className="mb-5 flex flex-wrap gap-2">
          {categories.map((item) => (
            <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item} className={`rounded-full px-4 py-2 font-display text-base font-extrabold transition ${category === item ? "bg-[var(--b-blue)] text-white" : "bg-[var(--home-tag)] text-[var(--home-navy)]"}`}>{item}</button>
          ))}
        </div>
        <p className="mb-3 text-sm font-bold text-[var(--home-navy)]">{filtered.length} {filtered.length === 1 ? "palavra encontrada" : "palavras encontradas"}</p>
        {filtered.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtered.map((item) => (
              <article key={item.word} className="flex min-w-0 flex-col items-center rounded-2xl bg-[var(--home-tag)] p-4 text-center">
                <span className="text-5xl" aria-hidden>{item.emoji}</span>
                <p className="mt-2 break-words font-display text-xl font-extrabold capitalize text-[var(--home-navy)]">{item.word}</p>
                <p className="mb-3 text-sm font-bold text-[var(--home-navy)]/70">{item.category}</p>
                <button type="button" onClick={() => speak(item.word)} aria-label={`Ouvir ${item.word}`} className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--b-blue)] text-white shadow-sm active:scale-95">
                  <Volume2 className="h-7 w-7" />
                </button>
              </article>
            ))}
          </div>
        ) : <p className="rounded-2xl bg-[var(--home-tag)] p-5 text-center font-bold text-[var(--home-navy)]">Nenhuma palavra encontrada. Tente outra busca ou categoria.</p>}
      </section>
    </Shell>
  );
}
