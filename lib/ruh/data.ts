import "server-only";
import { createClient } from "@/lib/supabase/server";
import { RUH_LESSONS, type RuhLevel } from "./catalog";

/** Forme (partielle) du store Rûh enregistré dans public.progress.data. */
type RuhStore = {
  profile?: { name?: string; level?: RuhLevel };
  lessons?: Record<string, { status?: string; updatedAt?: string }>;
  surahs?: Record<string, { status?: string; updatedAt?: string }>;
  quizzes?: Record<string, { best?: number; total?: number; attempts?: number; updatedAt?: string }>;
  goals?: { id: string; text: string; done: boolean; week?: string }[];
  dhikr?: { id: string; label: string; total?: number; count?: number; target?: number }[];
  activity?: Record<string, number>;
  favorites?: { verses?: unknown[]; duas?: unknown[]; lessons?: unknown[] };
};

const DONE = ["done", "completed", "complete", "finished", "mastered", "learned"];
const MEMORIZED = ["memorized", "memorised", "mastered", "learned", "done", "known"];

export type RuhSummary = {
  updatedAt: string;
  level: RuhLevel;
  lessons: { done: number; review: number; started: number; total: number };
  lessonsByLevel: Record<RuhLevel, { done: number; total: number }>;
  recentLessons: { id: string; title: string; status: string; at: string }[];
  surahs: { memorized: number; learning: number };
  quizzes: { count: number; avg: number | null };
  goals: { done: number; total: number };
  dhikrTotal: number;
  activeDays: number;
};

export async function getRuhSummary(): Promise<RuhSummary | null> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("dashboard_ruh_progress");
  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) return null;
  const s = (row.data ?? {}) as RuhStore;

  const lessonEntries = Object.entries(s.lessons ?? {});
  const statusOf = (id: string) => s.lessons?.[id]?.status ?? "";
  const isDone = (st: string) => DONE.includes(st);
  const byLevel = { debutant: { done: 0, total: 0 }, intermediaire: { done: 0, total: 0 }, avance: { done: 0, total: 0 } };
  for (const l of RUH_LESSONS) {
    byLevel[l.level].total++;
    const st = statusOf(l.id);
    if (isDone(st) || st === "review") byLevel[l.level].done++;
  }

  const quizzes = Object.values(s.quizzes ?? {}).filter((q) => q.total);
  const surahs = Object.values(s.surahs ?? {});
  const goals = s.goals ?? [];

  return {
    updatedAt: row.updated_at,
    level: s.profile?.level ?? "debutant",
    lessons: {
      done: lessonEntries.filter(([, v]) => isDone(v.status ?? "")).length,
      review: lessonEntries.filter(([, v]) => v.status === "review").length,
      started: lessonEntries.filter(([, v]) => !isDone(v.status ?? "") && v.status !== "review").length,
      total: RUH_LESSONS.length,
    },
    lessonsByLevel: byLevel,
    recentLessons: lessonEntries
      .map(([id, v]) => ({ id, title: RUH_LESSONS.find((l) => l.id === id)?.title ?? id, status: v.status ?? "", at: v.updatedAt ?? "" }))
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 12),
    surahs: {
      memorized: surahs.filter((x) => MEMORIZED.includes(x.status ?? "")).length,
      learning: surahs.filter((x) => x.status && !MEMORIZED.includes(x.status)).length,
    },
    quizzes: {
      count: quizzes.length,
      avg: quizzes.length ? Math.round((quizzes.reduce((a, q) => a + (q.best ?? 0) / (q.total ?? 1), 0) / quizzes.length) * 100) : null,
    },
    goals: { done: goals.filter((g) => g.done).length, total: goals.length },
    dhikrTotal: (s.dhikr ?? []).reduce((a, d) => a + (d.total ?? 0), 0),
    activeDays: Object.keys(s.activity ?? {}).length,
  };
}
