"use client";

import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { dictionaries, type Dict, type Locale } from "./dictionaries";

type Ctx = { locale: Locale; t: Dict; setLocale: (l: Locale) => void };

const I18nContext = createContext<Ctx | null>(null);

const ONE_YEAR = 60 * 60 * 24 * 365;

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const router = useRouter();
  const setLocale = useCallback(
    (l: Locale) => {
      document.cookie = `lang=${l}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
      document.documentElement.lang = l;
      router.refresh();
    },
    [router],
  );
  return (
    <I18nContext.Provider value={{ locale, t: dictionaries[locale], setLocale }}>{children}</I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n doit être utilisé dans <I18nProvider>");
  return ctx;
}
