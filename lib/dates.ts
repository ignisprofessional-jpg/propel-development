import type { Locale } from "@/lib/i18n/dictionaries";

export const APP_TZ = process.env.NEXT_PUBLIC_APP_TIMEZONE || "Europe/Paris";

/** Noms des mois hégiriens, translittérés comme sur Rûh. */
const HIJRI_MONTHS: Record<Locale, string[]> = {
  fr: [
    "Mouharram",
    "Safar",
    "Rabi‘ al-awwal",
    "Rabi‘ ath-thani",
    "Joumada al-oula",
    "Joumada ath-thaniya",
    "Rajab",
    "Cha‘bane",
    "Ramadan",
    "Chawwal",
    "Dhou al-Qi‘da",
    "Dhou al-Hijja",
  ],
  en: [
    "Muharram",
    "Safar",
    "Rabi‘ al-Awwal",
    "Rabi‘ al-Thani",
    "Jumada al-Ula",
    "Jumada al-Thaniya",
    "Rajab",
    "Sha‘ban",
    "Ramadan",
    "Shawwal",
    "Dhu al-Qi‘dah",
    "Dhu al-Hijjah",
  ],
};

export type HijriDate = { day: number; month: number; year: number; monthName: string };

export function toHijri(date: Date, locale: Locale): HijriDate {
  const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: APP_TZ,
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const month = get("month");
  return { day: get("day"), month, year: get("year"), monthName: HIJRI_MONTHS[locale][month - 1] ?? "" };
}

export function formatHijri(date: Date, locale: Locale): string {
  const h = toHijri(date, locale);
  return `${h.day} ${h.monthName} ${h.year} H`;
}

export function formatGregorian(date: Date, locale: Locale, opts?: { weekday?: boolean }): string {
  const s = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    weekday: opts?.weekday === false ? undefined : "long",
    day: "numeric",
    month: "long",
    timeZone: APP_TZ,
  }).format(date);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Minutes écoulées depuis minuit dans le fuseau de l'app. */
export function minutesNowInTz(date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: APP_TZ }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

/** « 1 h 12 min », « 8 min » */
export function formatDuration(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  return r === 0 ? `${h} h` : `${h} h ${String(r).padStart(2, "0")}`;
}
