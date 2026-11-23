/**
 * Arbre de progression : branches fixes, paliers qui se valident tout seuls
 * à partir des vraies données. Rien à créer ni à supprimer.
 */
import type { Locale } from "@/lib/i18n/dictionaries";

export type Metric =
  | "prayer_full_days"
  | "quran_pages"
  | "hifz_count"
  | "adhkar_sessions"
  | "ruh_lessons"
  | "ruh_levels"
  | "focus_hours"
  | "habit_checks"
  | "tasks_done"
  | "level";

export type Branch = {
  id: string;
  space: "islam" | "perso" | "game";
  icon: "prayer" | "quran" | "hifz" | "adhkar" | "ruh" | "focus" | "habits" | "tasks" | "level";
  name: Record<Locale, string>;
  metric: Metric;
  /** Adoration : pas d'XP si l'option « sans XP pour l'adoration » est active. */
  worship: boolean;
  steps: { target: number; label: Record<Locale, string> }[];
};

/** XP par palier (du 1er au 5e). */
export const STEP_XP = [20, 40, 80, 150, 300];

const days = (n: number, fr = `${n} jours`, en = `${n} days`) => ({ fr, en });

export const TREE: Branch[] = [
  {
    id: "prayer", space: "islam", icon: "prayer", metric: "prayer_full_days", worship: true,
    name: { fr: "Prière", en: "Prayer" },
    steps: [
      { target: 1, label: { fr: "1 jour 5/5", en: "1 day 5/5" } },
      { target: 7, label: days(7) },
      { target: 30, label: days(30) },
      { target: 100, label: days(100) },
      { target: 365, label: { fr: "1 an", en: "1 year" } },
    ],
  },
  {
    id: "quran", space: "islam", icon: "quran", metric: "quran_pages", worship: true,
    name: { fr: "Coran", en: "Quran" },
    steps: [
      { target: 1, label: { fr: "1 page", en: "1 page" } },
      { target: 20, label: { fr: "1 juz’", en: "1 juz’" } },
      { target: 100, label: { fr: "100 pages", en: "100 pages" } },
      { target: 604, label: { fr: "1 khatm", en: "1 khatm" } },
      { target: 1812, label: { fr: "3 khatms", en: "3 khatms" } },
    ],
  },
  {
    id: "hifz", space: "islam", icon: "hifz", metric: "hifz_count", worship: true,
    name: { fr: "Mémorisation", en: "Memorisation" },
    steps: [
      { target: 1, label: { fr: "1 sourate", en: "1 surah" } },
      { target: 3, label: { fr: "3 sourates", en: "3 surahs" } },
      { target: 10, label: { fr: "10 sourates", en: "10 surahs" } },
      { target: 37, label: { fr: "Juz’ ‘Amma", en: "Juz’ ‘Amma" } },
      { target: 50, label: { fr: "50 sourates", en: "50 surahs" } },
    ],
  },
  {
    id: "adhkar", space: "islam", icon: "adhkar", metric: "adhkar_sessions", worship: true,
    name: { fr: "Adhkar", en: "Adhkar" },
    steps: [
      { target: 1, label: { fr: "1 séance", en: "1 session" } },
      { target: 7, label: { fr: "7 séances", en: "7 sessions" } },
      { target: 30, label: { fr: "30 séances", en: "30 sessions" } },
      { target: 100, label: { fr: "100 séances", en: "100 sessions" } },
      { target: 365, label: { fr: "365 séances", en: "365 sessions" } },
    ],
  },
  {
    id: "ruh", space: "islam", icon: "ruh", metric: "ruh_lessons", worship: true,
    name: { fr: "Rûh", en: "Rûh" },
    steps: [
      { target: 1, label: { fr: "1 leçon", en: "1 lesson" } },
      { target: 5, label: { fr: "5 leçons", en: "5 lessons" } },
      { target: 13, label: { fr: "13 leçons", en: "13 lessons" } },
      { target: 25, label: { fr: "25 leçons", en: "25 lessons" } },
      { target: 37, label: { fr: "Tout Rûh", en: "All of Rûh" } },
    ],
  },
  {
    id: "focus", space: "perso", icon: "focus", metric: "focus_hours", worship: false,
    name: { fr: "Concentration", en: "Focus" },
    steps: [
      { target: 1, label: { fr: "1 heure", en: "1 hour" } },
      { target: 10, label: { fr: "10 heures", en: "10 hours" } },
      { target: 50, label: { fr: "50 heures", en: "50 hours" } },
      { target: 100, label: { fr: "100 heures", en: "100 hours" } },
      { target: 500, label: { fr: "500 heures", en: "500 hours" } },
    ],
  },
  {
    id: "habits", space: "perso", icon: "habits", metric: "habit_checks", worship: false,
    name: { fr: "Habitudes", en: "Habits" },
    steps: [
      { target: 7, label: { fr: "7 fois", en: "7 times" } },
      { target: 30, label: { fr: "30 fois", en: "30 times" } },
      { target: 100, label: { fr: "100 fois", en: "100 times" } },
      { target: 365, label: { fr: "365 fois", en: "365 times" } },
      { target: 1000, label: { fr: "1 000 fois", en: "1,000 times" } },
    ],
  },
  {
    id: "tasks", space: "perso", icon: "tasks", metric: "tasks_done", worship: false,
    name: { fr: "Tâches", en: "Tasks" },
    steps: [
      { target: 1, label: { fr: "1 tâche", en: "1 task" } },
      { target: 10, label: { fr: "10 tâches", en: "10 tasks" } },
      { target: 50, label: { fr: "50 tâches", en: "50 tasks" } },
      { target: 200, label: { fr: "200 tâches", en: "200 tasks" } },
      { target: 500, label: { fr: "500 tâches", en: "500 tasks" } },
    ],
  },
  {
    id: "level", space: "game", icon: "level", metric: "level", worship: false,
    name: { fr: "Niveau", en: "Level" },
    steps: [
      { target: 5, label: { fr: "Niveau 5", en: "Level 5" } },
      { target: 10, label: { fr: "Niveau 10", en: "Level 10" } },
      { target: 20, label: { fr: "Niveau 20", en: "Level 20" } },
      { target: 30, label: { fr: "Niveau 30", en: "Level 30" } },
      { target: 45, label: { fr: "Niveau 45", en: "Level 45" } },
    ],
  },
];

export const milestoneId = (branch: string, i: number) => `${branch}:${i + 1}`;

/** « habits:1 » → « Habitudes · 1 jour » */
export function milestoneLabel(id: string, locale: Locale): string | null {
  const [b, n] = id.split(":");
  const branch = TREE.find((x) => x.id === b);
  const step = branch?.steps[Number(n) - 1];
  return branch && step ? `${branch.name[locale]} · ${step.label[locale]}` : null;
}
export const MILESTONE_COUNT = TREE.reduce((a, b) => a + b.steps.length, 0);
