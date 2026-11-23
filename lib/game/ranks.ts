import type { Locale } from "@/lib/i18n/dictionaries";

export type Rank = { id: string; minLevel: number; name: Record<Locale, string> };

/** 8 rangs, débloqués par niveau. */
export const RANKS: Rank[] = [
  { id: "recrue", minLevel: 1, name: { fr: "Recrue", en: "Recruit" } },
  { id: "apprenti", minLevel: 5, name: { fr: "Apprenti", en: "Apprentice" } },
  { id: "eclaireur", minLevel: 10, name: { fr: "Éclaireur", en: "Scout" } },
  { id: "artisan", minLevel: 20, name: { fr: "Artisan", en: "Artisan" } },
  { id: "veteran", minLevel: 30, name: { fr: "Vétéran", en: "Veteran" } },
  { id: "expert", minLevel: 45, name: { fr: "Expert", en: "Expert" } },
  { id: "maitre", minLevel: 60, name: { fr: "Maître", en: "Master" } },
  { id: "legende", minLevel: 80, name: { fr: "Légende", en: "Legend" } },
];

/** XP nécessaire pour passer du niveau n au niveau n+1. */
export const xpForLevel = (n: number) => Math.round(100 * Math.pow(n, 1.5));

export function levelFromXp(totalXp: number) {
  let level = 1;
  let remaining = Math.max(0, totalXp);
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  const needed = xpForLevel(level);
  return { level, xpInLevel: remaining, xpNeeded: needed, progress: remaining / needed };
}

export function rankForLevel(level: number): Rank {
  return [...RANKS].reverse().find((r) => level >= r.minLevel) ?? RANKS[0];
}
