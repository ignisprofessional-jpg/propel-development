"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import s from "./shell.module.css";

const ONE_YEAR = 60 * 60 * 24 * 365;

export function setThemeCookie(theme: "dark" | "light") {
  document.documentElement.dataset.theme = theme;
  document.cookie = `theme=${theme}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#eef1f7" : "#0a0a0b");
}

export function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);
  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setThemeCookie(next);
    setTheme(next);
  };
  return { theme, toggle, set: (t: "dark" | "light") => (setThemeCookie(t), setTheme(t)) };
}

export function ThemeToggle() {
  const { t } = useI18n();
  const { theme, set } = useTheme();
  return (
    <div className={s.seg} role="group" aria-label={t.theme.toggle}>
      <button className={`${s.segBtn} ${theme === "light" ? s.segBtnOn : ""}`} onClick={() => set("light")} aria-pressed={theme === "light"} aria-label={t.theme.light}>
        <Sun size={14} />
      </button>
      <button className={`${s.segBtn} ${theme === "dark" ? s.segBtnOn : ""}`} onClick={() => set("dark")} aria-pressed={theme === "dark"} aria-label={t.theme.dark}>
        <Moon size={14} />
      </button>
    </div>
  );
}

export function LangToggle() {
  const { locale, setLocale } = useI18n();
  return (
    <div className={s.seg} role="group" aria-label="Langue / Language">
      {(["fr", "en"] as const).map((l) => (
        <button key={l} className={`${s.segBtn} ${locale === l ? s.segBtnOn : ""}`} onClick={() => setLocale(l)} aria-pressed={locale === l} lang={l}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
