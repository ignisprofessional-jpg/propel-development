import { addDays } from "@/lib/day";
import { toHijri } from "@/lib/dates";
import type { Locale } from "@/lib/i18n/dictionaries";

/**
 * Jours à venir dans le calendrier hégirien (Umm al-Qura, peut varier d'un jour
 * selon l'observation locale du croissant) : jours de jeûne recommandés et fêtes.
 */
export type IslamicDay = {
  day: string; // AAAA-MM-JJ (début)
  endDay?: string; // pour une période (jours blancs, dix jours…)
  hijri: string;
  label: string;
  fast: boolean;
  inDays: number;
};

type Def = { m: number; d: number; fr: string; en: string; fast: boolean; span?: number };

const FIXED: Def[] = [
  { m: 1, d: 1, fr: "Nouvel an hégirien", en: "Islamic New Year", fast: false },
  { m: 1, d: 9, fr: "Tâsû‘â’ et ‘Âshûrâ’", en: "Tasu‘a and ‘Ashura", fast: true, span: 2 },
  { m: 9, d: 1, fr: "Début du Ramadan", en: "Start of Ramadan", fast: true },
  { m: 9, d: 21, fr: "Dix dernières nuits du Ramadan", en: "Last ten nights of Ramadan", fast: true, span: 9 },
  { m: 10, d: 1, fr: "‘Îd al-Fitr", en: "Eid al-Fitr", fast: false },
  { m: 10, d: 2, fr: "Six jours de Shawwâl", en: "Six days of Shawwal", fast: true, span: 28 },
  { m: 12, d: 1, fr: "Dix premiers jours de Dhou al-Hijja", en: "First ten days of Dhul Hijjah", fast: true, span: 9 },
  { m: 12, d: 9, fr: "Jour de ‘Arafa", en: "Day of ‘Arafah", fast: true },
  { m: 12, d: 10, fr: "‘Îd al-Adhâ", en: "Eid al-Adha", fast: false },
];

export function upcomingIslamicDays(today: string, locale: Locale, horizon = 120, limit = 8): IslamicDay[] {
  const out: IslamicDay[] = [];
  let nextMonThu: IslamicDay | null = null;
  for (let i = 0; i <= horizon && out.length < limit + 4; i++) {
    const day = addDays(today, i);
    const h = toHijri(new Date(day + "T12:00:00Z"), locale);
    const hijri = `${h.day} ${h.monthName} ${h.year}`;

    // Jours blancs (13, 14, 15) : une entrée par mois. Pas en Ramadan, ni en Dhou al-Hijja
    // (le 13 fait partie des jours de Tashrîq, où l'on ne jeûne pas).
    const whiteOk = h.month !== 9 && h.month !== 12;
    if (whiteOk && (h.day === 13 || (i === 0 && (h.day === 14 || h.day === 15)))) {
      out.push({ day, endDay: addDays(day, 15 - h.day), hijri, label: locale === "fr" ? "Jours blancs (13, 14, 15)" : "White days (13, 14, 15)", fast: true, inDays: i });
    }
    for (const f of FIXED) {
      if (h.month === f.m && h.day === f.d) {
        out.push({ day, endDay: f.span ? addDays(day, f.span - 1) : undefined, hijri, label: f[locale], fast: f.fast, inDays: i });
      }
    }
    // Prochain lundi ou jeudi (hors Ramadan)
    const wd = new Date(day + "T12:00:00Z").getUTCDay();
    if (!nextMonThu && h.month !== 9 && (wd === 1 || wd === 4)) {
      nextMonThu = {
        day,
        hijri,
        label: locale === "fr" ? (wd === 1 ? "Jeûne du lundi" : "Jeûne du jeudi") : wd === 1 ? "Monday fast" : "Thursday fast",
        fast: true,
        inDays: i,
      };
    }
  }
  const list = [...(nextMonThu ? [nextMonThu] : []), ...out].sort((a, b) => a.inDays - b.inDays);
  return list.slice(0, limit);
}
