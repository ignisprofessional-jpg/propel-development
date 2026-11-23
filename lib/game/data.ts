import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/islam/data";
import { getRuhSummary } from "@/lib/ruh/data";
import { PRAYER_KEYS } from "@/lib/islam/prayer-times";
import { adhkarFor } from "@/lib/islam/adhkar";
import { levelFromXp } from "./ranks";
import { MILESTONE_COUNT, STEP_XP, TREE, milestoneId, type Metric } from "./tree";

type Sb = Awaited<ReturnType<typeof createClient>>;

export const getTotals = cache(async () => {
  const sb = await createClient();
  const { data } = await sb.rpc("dashboard_game_totals");
  const row = Array.isArray(data) ? data[0] : null;
  return { xp: Number(row?.xp ?? 0) };
});

/* ---------------- Mesures (toutes réelles) ---------------- */

async function loadMetrics(sb: Sb): Promise<Record<Metric, number>> {
  const [prayers, reading, hifz, adhkar, focus, habits, tasks, ruh, totals] = await Promise.all([
    sb.from("islam_prayer_logs").select("day"),
    sb.from("islam_quran_reading").select("pages"),
    sb.from("islam_hifz").select("surah", { count: "exact", head: true }).eq("status", "memorized"),
    sb.from("islam_adhkar_logs").select("period, items"),
    sb.from("focus_sessions").select("minutes"),
    sb.from("perso_habit_logs").select("day", { count: "exact", head: true }),
    sb.from("tasks").select("id", { count: "exact", head: true }).eq("status", "done"),
    getRuhSummary(),
    getTotals(),
  ]);
  const byDay = new Map<string, number>();
  for (const r of prayers.data ?? []) byDay.set(r.day, (byDay.get(r.day) ?? 0) + 1);
  return {
    prayer_full_days: [...byDay.values()].filter((n) => n >= PRAYER_KEYS.length).length,
    quran_pages: (reading.data ?? []).reduce((a, r) => a + r.pages, 0),
    hifz_count: hifz.count ?? 0,
    adhkar_sessions: (adhkar.data ?? []).filter((r) => (r.items?.length ?? 0) >= adhkarFor(r.period as "morning" | "evening").length).length,
    ruh_lessons: ruh ? ruh.lessons.done + ruh.lessons.review : 0,
    ruh_levels: ruh ? Object.values(ruh.lessonsByLevel).filter((l) => l.done >= l.total).length : 0,
    focus_hours: Math.floor((focus.data ?? []).reduce((a, r) => a + r.minutes, 0) / 60),
    habit_checks: habits.count ?? 0,
    tasks_done: tasks.count ?? 0,
    level: levelFromXp(totals.xp).level,
  };
}

export type TreeStep = { id: string; target: number; current: number; xp: number; state: "done" | "available" | "locked"; achievedAt: string | null };
export type TreeState = { branches: { id: string; steps: TreeStep[] }[]; done: number; total: number };

/**
 * Enregistre les paliers atteints (et l'XP, sauf adoration si l'option est active),
 * puis renvoie l'état de l'arbre. Un palier obtenu le reste, même si les données baissent.
 */
export async function syncTree(): Promise<TreeState> {
  const sb = await createClient();
  const [metrics, settings, { data: achieved }] = await Promise.all([
    loadMetrics(sb),
    getSettings(),
    sb.from("game_milestones").select("id, achieved_at"),
  ]);
  const got = new Map((achieved ?? []).map((r) => [r.id as string, r.achieved_at as string]));
  const fresh: { id: string; xp: number }[] = [];

  const branches = TREE.map((b) => {
    let prevDone = true;
    const steps = b.steps.map((s, i): TreeStep => {
      const id = milestoneId(b.id, i);
      const current = metrics[b.metric];
      const xp = b.worship && settings.no_xp_for_worship ? 0 : STEP_XP[i];
      let achievedAt = got.get(id) ?? null;
      if (!achievedAt && prevDone && current >= s.target) {
        achievedAt = new Date().toISOString();
        fresh.push({ id, xp });
      }
      const state = achievedAt ? "done" : prevDone ? "available" : "locked";
      prevDone = !!achievedAt;
      return { id, target: s.target, current, xp, state, achievedAt };
    });
    return { id: b.id, steps };
  });

  if (fresh.length) {
    await sb.from("game_milestones").upsert(fresh.map((f) => ({ id: f.id })), { onConflict: "id", ignoreDuplicates: true });
    const xpRows = fresh.filter((f) => f.xp > 0).map((f) => ({ amount: f.xp, source: "milestone", label: f.id, ref: f.id }));
    if (xpRows.length) await sb.from("game_xp_events").upsert(xpRows, { onConflict: "source,ref", ignoreDuplicates: true });
  }

  const done = branches.reduce((a, b) => a + b.steps.filter((s) => s.state === "done").length, 0);
  return { branches, done, total: MILESTONE_COUNT };
}

/* ---------------- Lecture ---------------- */

export async function getXpByDay(fromIso: string): Promise<Record<string, number>> {
  const sb = await createClient();
  const { data } = await sb.from("game_xp_events").select("amount, created_at").gte("created_at", fromIso);
  const out: Record<string, number> = {};
  for (const r of data ?? []) {
    const d = r.created_at.slice(0, 10);
    out[d] = (out[d] ?? 0) + r.amount;
  }
  return out;
}

export async function getRecentXp(limit = 40) {
  const sb = await createClient();
  const { data } = await sb.from("game_xp_events").select("id, amount, source, label, created_at").order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as { id: number; amount: number; source: string; label: string; created_at: string }[];
}

export async function getMilestoneCount() {
  const sb = await createClient();
  const { count } = await sb.from("game_milestones").select("id", { count: "exact", head: true });
  return { done: count ?? 0, total: MILESTONE_COUNT };
}
