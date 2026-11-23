import "server-only";
import { RANKS, levelFromXp, rankForLevel } from "@/lib/game/ranks";
import type { Locale } from "@/lib/i18n/dictionaries";
import type { ShellGame, ShellUser } from "@/components/layout/types";

/** Prénom affiché (Paramètres). */
export function shellUserFrom(firstName: string): ShellUser {
  return { name: firstName.trim(), avatarUrl: null };
}

/** Niveau et rang à partir de l'XP réelle. */
export function getShellGame(locale: Locale, totalXp = 0): ShellGame {
  const l = levelFromXp(totalXp);
  const rank = rankForLevel(l.level);
  return { level: l.level, xpInLevel: l.xpInLevel, xpNeeded: l.xpNeeded, rankName: rank.name[locale], rankIndex: RANKS.indexOf(rank) };
}
