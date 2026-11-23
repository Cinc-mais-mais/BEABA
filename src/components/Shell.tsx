import { Link } from "@tanstack/react-router";
import { Home, GraduationCap, User, CaseSensitive } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import logo from "@/assets/iconpng.png";
import { speak } from "@/lib/app";

const tabs = [
  { to: "/", label: "Início", icon: Home, color: "bg-red" },
  { to: "/professor", label: "Professor", icon: GraduationCap, color: "bg-blue" },
  { to: "/perfil", label: "Perfil", icon: User, color: "bg-yellow" },
] as const;

export function Shell({ children, home = false, highlightLargeText = false, largeTextReady = false, onLargeTextTutorialToggle }: { children: ReactNode; home?: boolean; highlightLargeText?: boolean; largeTextReady?: boolean; onLargeTextTutorialToggle?: () => void }) {
  const [largeTextEnabled, setLargeTextEnabled] = useState(false);
  const homeTapSequence = useRef<number[]>([]);

  useEffect(() => {
    try {
      const enabled = window.localStorage.getItem("beaba-large-text") === "true";
      setLargeTextEnabled(enabled);
      document.documentElement.style.fontSize = enabled ? "24px" : "";
    } catch {
      setLargeTextEnabled(false);
    }
  }, []);

  const toggleLargeText = () => {
    const next = !largeTextEnabled;
    setLargeTextEnabled(next);
    try {
      window.localStorage.setItem("beaba-large-text", String(next));
    } catch {
      // Keep the preference active for this session if browser storage is unavailable.
    }
    document.documentElement.style.fontSize = next ? "24px" : "";
    speak(next ? "Texto ampliado ativado." : "Tamanho de texto normal ativado.");
  };

  void home;
  return (
    <div className="app-shell relative min-h-dvh overflow-x-clip bg-[var(--home-bg)] pb-28">
      <div aria-hidden className="pointer-events-none fixed -left-[6vw] top-[15dvh] z-0 h-[13vw] w-[24vw] rounded-[60%_40%_55%_45%] bg-[var(--home-blob-l)]" />
      <div aria-hidden className="pointer-events-none fixed -right-[6vw] top-[19dvh] z-0 h-[12vw] w-[21vw] rounded-[45%_55%_40%_60%] bg-[var(--home-blob-r)]" />
      <div aria-hidden className="pointer-events-none fixed -left-[8vw] bottom-28 z-0 h-[20vw] w-[36vw] rounded-[55%_45%_40%_60%] bg-[var(--home-blob-l)]" />
      <div aria-hidden className="pointer-events-none fixed -right-[7vw] bottom-32 z-0 h-[18vw] w-[32vw] rounded-[45%_55%_60%_40%] bg-[var(--home-blob-r)]" />
      {highlightLargeText && <div className="fixed inset-0 z-40 bg-slate-950/20 pointer-events-none" aria-hidden="true" />}
      <header className={`app-header relative ${highlightLargeText ? "z-50" : "z-10"}`}>
        <div className="relative flex h-[11dvh] min-h-16 items-center justify-between bg-[var(--home-header)] px-5">
          <img
            src={logo}
            alt="BEABÁ"
            className="w-[22vw] max-h-[11dvh] object-contain"
          />

          <div className="flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => {
                if (!highlightLargeText || !largeTextReady || !largeTextEnabled) {
                  toggleLargeText();
                }
                if (highlightLargeText && largeTextReady) onLargeTextTutorialToggle?.();
              }}
              disabled={highlightLargeText && !largeTextReady}
              aria-pressed={largeTextEnabled}
              aria-label={largeTextEnabled ? "Desativar texto grande" : "Ativar texto grande"}
              title={largeTextEnabled ? "Desativar texto grande" : "Ativar texto grande"}
              data-tutorial-target="large-text"
              className={`relative z-[70] flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/75 shadow-[0_3px_10px_rgb(0_0_0/0.18)] transition active:scale-95 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-wait ${largeTextEnabled ? "bg-[var(--b-blue)]" : "bg-white/15"} ${highlightLargeText ? "tutorial-focus-target tutorial-header-focus" : ""}`}
            >
              <CaseSensitive className="h-7 w-7 text-white" strokeWidth={2.5} />
            </button>
          </div>
        </div>
        <svg
          aria-hidden
          viewBox="0 0 100 8"
          preserveAspectRatio="none"
          className="block h-[16px] w-full text-[var(--home-header)] [filter:drop-shadow(0_5px_8px_rgba(0,0,0,0.10))]"
        >
          <path
            fill="currentColor"
            d="M0 0 H100 V1 Q99.5 2.2 98 3 C 88 6.6, 72 7.8, 50 7.8 C 30 7.8, 14 6.4, 5 4.6 Q 0.9 3.6, 0 2.6 Z"
          />
        </svg>
      </header>
      <main className="app-main relative z-10 mx-auto max-w-2xl px-4 py-6">{children}</main>

      <nav className="app-nav fixed inset-x-0 bottom-0 z-30 rounded-t-[2rem] bg-[var(--home-nav)] shadow-[0_-4px_16px_rgb(0_0_0/0.08)]">
        <ul className="mx-auto flex max-w-2xl justify-around pb-3 pt-4">
          {tabs.map((t) => (
            <li key={t.to}>
              <Link to={t.to} onClick={() => { speak(t.label); if (t.to === "/") { const now = Date.now(); homeTapSequence.current = [...homeTapSequence.current.filter((time) => now - time <= 2500), now]; if (homeTapSequence.current.length >= 6) { homeTapSequence.current = []; window.dispatchEvent(new Event("beaba-dev-mode")); } } else { homeTapSequence.current = []; } }} className="flex flex-col items-center gap-1 text-lg font-bold" activeOptions={{ exact: true }}>
                {({ isActive }) => (
                  <span className={`flex flex-col items-center gap-1 ${isActive ? "text-[var(--home-active)]" : "text-[var(--home-navy)]"}`}>
                    <t.icon className="h-9 w-9" strokeWidth={2.5} />
                    {t.label}
                    <span className={`h-1.5 w-8 rounded-full ${isActive ? "bg-[var(--home-active)]" : "bg-transparent"}`} />
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );

}
