"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addDays, dayKey } from "@/lib/day";
import { syncTree } from "@/lib/game/data";
import type { Recurrence, TaskSpace, TaskStatus } from "./types";

type Result = { ok: true; id?: string } | { ok: false; error: string };
const fail = (e: { message: string } | null): Result => (e ? { ok: false, error: e.message } : { ok: true });
const isDay = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
const SPACES: TaskSpace[] = ["perso", "agence", "islam"];
const RECUR: Recurrence[] = ["daily", "weekdays", "weekly", "monthly"];

async function xp(source: "habit" | "task" | "focus", ref: string, amount: number | null, label: string) {
  const sb = await createClient();
  if (amount === null || amount <= 0) {
    if (amount === null) await sb.from("game_xp_events").delete().eq("source", source).eq("ref", ref);
    return;
  }
  await sb.from("game_xp_events").upsert({ amount, source, label, ref }, { onConflict: "source,ref", ignoreDuplicates: true });
}
const later = () => after(async () => void (await syncTree()));
const refresh = (...paths: string[]) => {
  for (const p of paths) revalidatePath(p);
  revalidatePath("/", "layout");
};

/* ---------------- Habitudes ---------------- */

export async function createHabit(title: string, frequency: "daily" | "weekly", perWeek: number): Promise<Result> {
  const t = title.trim().slice(0, 80);
  if (!t) return { ok: false, error: "invalid" };
  const sb = await createClient();
  const { data, error } = await sb
    .from("perso_habits")
    .insert({ title: t, frequency, per_week: frequency === "daily" ? 7 : Math.max(1, Math.min(7, Math.round(perWeek))), sort: 99 })
    .select("id")
    .single();
  refresh("/perso/habitudes");
  return error ? fail(error) : { ok: true, id: data.id };
}

export async function archiveHabit(id: string): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.from("perso_habits").update({ archived: true }).eq("id", id);
  refresh("/perso/habitudes");
  return fail(error);
}

export async function toggleHabit(id: string, day: string, on: boolean): Promise<Result> {
  if (!isDay(day) || day > dayKey()) return { ok: false, error: "invalid" };
  const sb = await createClient();
  const { error } = on
    ? await sb.from("perso_habit_logs").upsert({ habit_id: id, day }, { ignoreDuplicates: true })
    : await sb.from("perso_habit_logs").delete().eq("habit_id", id).eq("day", day);
  if (!error) await xp("habit", `${id}:${day}`, on ? 5 : null, "habitude");
  later();
  refresh("/perso/habitudes");
  return fail(error);
}

/* ---------------- Tâches ---------------- */

export async function createTask(input: { title: string; space: TaskSpace; due_date: string | null; priority: number; recurrence: Recurrence | null }): Promise<Result> {
  const t = input.title.trim().slice(0, 200);
  if (!t || !SPACES.includes(input.space)) return { ok: false, error: "invalid" };
  const sb = await createClient();
  const { data, error } = await sb
    .from("tasks")
    .insert({
      title: t,
      space: input.space,
      due_date: input.due_date && isDay(input.due_date) ? input.due_date : null,
      priority: Math.max(0, Math.min(2, Math.round(input.priority))),
      recurrence: input.recurrence && RECUR.includes(input.recurrence) ? input.recurrence : null,
    })
    .select("id")
    .single();
  refresh("/perso/taches");
  return error ? fail(error) : { ok: true, id: data.id };
}

function nextDue(from: string, r: Recurrence): string {
  if (r === "daily") return addDays(from, 1);
  if (r === "weekly") return addDays(from, 7);
  if (r === "monthly") {
    const [y, m, d] = from.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m, Math.min(d, 28)));
    return dt.toISOString().slice(0, 10);
  }
  // jours ouvrés
  let n = addDays(from, 1);
  while ([0, 6].includes(new Date(n + "T12:00:00Z").getUTCDay())) n = addDays(n, 1);
  return n;
}

export async function setTaskStatus(id: string, status: TaskStatus): Promise<Result> {
  const sb = await createClient();
  const { data: task } = await sb.from("tasks").select("id, title, space, priority, due_date, recurrence, notes, status").eq("id", id).maybeSingle();
  if (!task) return { ok: false, error: "not_found" };
  const { error } = await sb.from("tasks").update({ status, done_at: status === "done" ? new Date().toISOString() : null }).eq("id", id);
  if (!error) await xp("task", id, status === "done" ? 10 : null, task.title);
  // Tâche récurrente terminée : on crée la suivante
  if (!error && status === "done" && task.status !== "done" && task.recurrence) {
    await sb.from("tasks").insert({
      title: task.title,
      space: task.space,
      priority: task.priority,
      notes: task.notes,
      recurrence: task.recurrence,
      due_date: nextDue(task.due_date ?? dayKey(), task.recurrence as Recurrence),
    });
  }
  later();
  refresh("/perso/taches");
  return fail(error);
}

export async function updateTask(id: string, patch: { title?: string; due_date?: string | null; space?: TaskSpace; priority?: number }): Promise<Result> {
  const p: Record<string, unknown> = {};
  if (patch.title !== undefined) p.title = patch.title.trim().slice(0, 200) || "Tâche";
  if (patch.due_date !== undefined) p.due_date = patch.due_date && isDay(patch.due_date) ? patch.due_date : null;
  if (patch.space && SPACES.includes(patch.space)) p.space = patch.space;
  if (patch.priority !== undefined) p.priority = Math.max(0, Math.min(2, Math.round(patch.priority)));
  const sb = await createClient();
  const { error } = await sb.from("tasks").update(p).eq("id", id);
  refresh("/perso/taches");
  return fail(error);
}

export async function deleteTask(id: string): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.from("tasks").delete().eq("id", id);
  await xp("task", id, null, "");
  refresh("/perso/taches");
  return fail(error);
}

/* ---------------- Concentration ---------------- */

export async function saveFocus(input: { startedAt: string; minutes: number; mode: "pomodoro" | "free"; taskId: string | null; label: string }): Promise<Result> {
  const minutes = Math.round(input.minutes);
  if (!(minutes >= 1 && minutes <= 720)) return { ok: false, error: "invalid" };
  const started = new Date(input.startedAt);
  if (Number.isNaN(started.getTime())) return { ok: false, error: "invalid" };
  const sb = await createClient();
  const { data, error } = await sb
    .from("focus_sessions")
    .insert({
      started_at: started.toISOString(),
      ended_at: new Date(started.getTime() + minutes * 60_000).toISOString(),
      minutes,
      mode: input.mode,
      task_id: input.taskId,
      label: input.label.trim().slice(0, 120),
    })
    .select("id")
    .single();
  if (data) await xp("focus", data.id, Math.floor(minutes / 5), `${minutes} min`);
  later();
  refresh("/perso/concentration");
  return error ? fail(error) : { ok: true, id: data.id };
}

export async function deleteFocus(id: string): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.from("focus_sessions").delete().eq("id", id);
  await xp("focus", id, null, "");
  refresh("/perso/concentration");
  return fail(error);
}

/* ---------------- Objectifs ---------------- */

export async function createGoal(title: string, why: string, targetDate: string | null): Promise<Result> {
  const t = title.trim().slice(0, 120);
  if (!t) return { ok: false, error: "invalid" };
  const sb = await createClient();
  const { data, error } = await sb
    .from("perso_goals")
    .insert({ title: t, why: why.trim().slice(0, 300), target_date: targetDate && isDay(targetDate) ? targetDate : null })
    .select("id")
    .single();
  refresh("/perso/objectifs");
  return error ? fail(error) : { ok: true, id: data.id };
}

export async function deleteGoal(id: string): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.from("perso_goals").delete().eq("id", id);
  refresh("/perso/objectifs");
  return fail(error);
}

export async function addGoalStep(goalId: string, title: string): Promise<Result> {
  const t = title.trim().slice(0, 160);
  if (!t) return { ok: false, error: "invalid" };
  const sb = await createClient();
  const { error } = await sb.from("perso_goal_steps").insert({ goal_id: goalId, title: t, sort: 99 });
  await sb.from("perso_goals").update({ done_at: null }).eq("id", goalId);
  refresh("/perso/objectifs");
  return fail(error);
}

export async function toggleGoalStep(goalId: string, stepId: string, done: boolean): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.from("perso_goal_steps").update({ done_at: done ? new Date().toISOString() : null }).eq("id", stepId);
  // Objectif atteint quand toutes ses étapes sont faites
  const { data: steps } = await sb.from("perso_goal_steps").select("done_at").eq("goal_id", goalId);
  const all = (steps ?? []).length > 0 && (steps ?? []).every((s) => s.done_at);
  await sb.from("perso_goals").update({ done_at: all ? new Date().toISOString() : null }).eq("id", goalId);
  refresh("/perso/objectifs");
  return fail(error);
}

export async function deleteGoalStep(stepId: string): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.from("perso_goal_steps").delete().eq("id", stepId);
  refresh("/perso/objectifs");
  return fail(error);
}
