import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDays, dayKey } from "@/lib/day";
import type { FocusSession, Goal, Habit, Task } from "./types";

export async function getHabits(sinceDays = 182): Promise<Habit[]> {
  const sb = await createClient();
  const from = addDays(dayKey(), -sinceDays);
  const [{ data: habits }, { data: logs }] = await Promise.all([
    sb.from("perso_habits").select("id, title, frequency, per_week, sort, created_at").eq("archived", false).order("sort").order("created_at"),
    sb.from("perso_habit_logs").select("habit_id, day").gte("day", from),
  ]);
  return (habits ?? []).map((h) => ({
    id: h.id,
    title: h.title,
    frequency: h.frequency,
    per_week: h.per_week,
    logs: (logs ?? []).filter((l) => l.habit_id === h.id).map((l) => l.day),
  }));
}

export async function getTasks(opts: { includeDoneSince?: string } = {}): Promise<Task[]> {
  const sb = await createClient();
  const since = opts.includeDoneSince ?? addDays(dayKey(), -14);
  const { data } = await sb
    .from("tasks")
    .select("id, title, space, status, priority, due_date, recurrence, notes, done_at, created_at")
    .or(`status.neq.done,done_at.gte.${since}T00:00:00Z`)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("priority", { ascending: false })
    .order("created_at");
  return (data ?? []) as Task[];
}

export async function getFocus(sinceDays = 30): Promise<FocusSession[]> {
  const sb = await createClient();
  const from = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
  const { data } = await sb.from("focus_sessions").select("id, started_at, minutes, mode, label, task_id").gte("started_at", from).order("started_at", { ascending: false });
  return (data ?? []) as FocusSession[];
}

export async function getGoals(): Promise<Goal[]> {
  const sb = await createClient();
  const [{ data: goals }, { data: steps }] = await Promise.all([
    sb.from("perso_goals").select("id, title, why, target_date, done_at, created_at").order("done_at", { nullsFirst: true }).order("created_at"),
    sb.from("perso_goal_steps").select("id, goal_id, title, done_at, sort, created_at").order("sort").order("created_at"),
  ]);
  return (goals ?? []).map((g) => ({
    id: g.id,
    title: g.title,
    why: g.why,
    target_date: g.target_date,
    done_at: g.done_at,
    steps: (steps ?? []).filter((s) => s.goal_id === g.id).map((s) => ({ id: s.id, title: s.title, done_at: s.done_at })),
  }));
}

/** Habitudes prévues aujourd'hui (quotidiennes + hebdomadaires pas encore remplies cette semaine). */
export function habitsDueToday(habits: Habit[], today: string) {
  const weekStart = (() => {
    const wd = (new Date(today + "T12:00:00Z").getUTCDay() + 6) % 7; // lundi = 0
    return addDays(today, -wd);
  })();
  let done = 0;
  let total = 0;
  for (const h of habits) {
    const todayDone = h.logs.includes(today);
    if (h.frequency === "daily") {
      total++;
      if (todayDone) done++;
    } else {
      const weekCount = h.logs.filter((d) => d >= weekStart && d <= today).length;
      if (weekCount < h.per_week || todayDone) {
        total++;
        if (todayDone) done++;
      }
    }
  }
  return { done, total };
}
