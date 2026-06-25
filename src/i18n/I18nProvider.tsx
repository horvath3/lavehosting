import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translate, type Locale, DICTS } from "./dictionaries";

const STORAGE_KEY = "lave.locale";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<Ctx | null>(null);

function readInitial(): Locale {
  if (typeof window === "undefined") return "hu";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "hu" || stored === "en") return stored;
  return "hu";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("hu");

  useEffect(() => {
    setLocaleState(readInitial());
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, l);
      document.documentElement.lang = l;
    }
  }, []);

  // Allow account.tsx to push the server-side preferred locale into the context.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ locale: Locale }>).detail;
      if (detail?.locale && DICTS[detail.locale]) setLocaleState(detail.locale);
    };
    window.addEventListener("lave:set-locale", handler as EventListener);
    return () => window.removeEventListener("lave:set-locale", handler as EventListener);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

export function useT() {
  return useI18n().t;
}

export function pushServerLocale(locale: Locale) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("lave:set-locale", { detail: { locale } }));
  window.localStorage.setItem(STORAGE_KEY, locale);
  document.documentElement.lang = locale;
}
