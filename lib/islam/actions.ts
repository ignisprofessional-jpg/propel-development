"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { syncTree } from "@/lib/game/data";
import { getSettings } from "./data";
import { adhkarFor } from "./adhkar";
import { createClient } from "@/lib/supabase/server";
import { addDays, dayKey } from "@/lib/day";
import { PRAYER_KEYS, CALC_METHODS, type PrayerKey } from "./prayer-times";
import { NAFL_KINDS, type NaflKind, type PrayerStatus } from "./types";
import { nextInterval } from "./surahs";
import type { Period } from "./adhkar";

type Result = { ok: true } | { ok: false; error: string };
const fail = (e: { message: string } | null): Result => (e ? { ok: false, error: e.message } : { ok: true });
const isDay = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);

/** Donne (ou retire) de l'XP pour un acte d'adoration — seulement si l'option « sans XP » est désactivée. */
async function worshipXp(source: "prayer" | "quran" | "adhkar", ref: string, amount: number | null, label: string) {
  const settings = await getSettings();
  const sb = await createClient();
  if (amount === null) {
    await sb.from("game_xp_events").delete().eq("source", source).eq("ref", ref);
    return;
  }
  if (settings.no_xp_for_worship) return;
  await sb.from("game_xp_events").upsert({ amount, source, label, ref }, { onConflict: "source,ref", ignoreDuplicates: true });
}
const syncLater = () => after(async () => {
  await syncTree();
});

/* ---------------- Prières ---------------- */

export async function setPrayerStatus(day: string, prayer: PrayerKey, status: PrayerStatus | null): Promise<Result> {
  if (!isDay(day) || !PRAYER_KEYS.includes(prayer)) return { ok: false, error: "invalid" };
  const sb = await createClient();
  const { error } = status
    ? await sb.from("islam_prayer_logs").upsert({ day, prayer, status, logged_at: new Date().toISOString() })
    : await sb.from("islam_prayer_logs").delete().eq("day", day).eq("prayer", prayer);
  if (!error) await worshipXp("prayer", `${day}:${prayer}`, status ? 5 : null, prayer);
  syncLater();
  revalidatePath("/islam/priere");
  revalidatePath("/");
  return fail(error);
}

export async function toggleNafl(day: string, kind: NaflKind, on: boolean): Promise<Result> {
  if (!isDay(day) || !NAFL_KINDS.includes(kind)) return { ok: false, error: "invalid" };
  const sb = await createClient();
  const { error } = on
    ? await sb.from("islam_nafl_logs").upsert({ day, kind })
    : await sb.from("islam_nafl_logs").delete().eq("day", day).eq("kind", kind);
  revalidatePath("/islam/priere");
  return fail(error);
}

/* ---------------- Coran ---------------- */

export async function addQuranPages(pages: number): Promise<Result> {
  const n = Math.round(pages);
  if (!(n >= 1 && n <= 604)) return { ok: false, error: "invalid" };
  const sb = await createClient();
  const { data, error } = await sb.from("islam_quran_reading").insert({ day: dayKey(), pages: n }).select("id").single();
  if (data) await worshipXp("quran", String(data.id), n, `${n} pages`);
  syncLater();
  revalidatePath("/islam/coran");
  revalidatePath("/");
  return fail(error);
}

export async function undoQuranEntry(id: number): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.from("islam_quran_reading").delete().eq("id", id);
  await worshipXp("quran", String(id), null, "");
  syncLater();
  revalidatePath("/islam/coran");
  revalidatePath("/");
  return fail(error);
}

export async function setQuranPosition(page: number, surah: number): Promise<Result> {
  if (!(page >= 1 && page <= 604 && surah >= 1 && surah <= 114)) return { ok: false, error: "invalid" };
  const sb = await createClient();
  const { error } = await sb
    .from("islam_quran_position")
    .update({ page: Math.round(page), surah: Math.round(surah), updated_at: new Date().toISOString() })
    .eq("id", 1);
  revalidatePath("/islam/coran");
  return fail(error);
}

export async function restartKhatm(): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.from("dash_settings").update({ khatm_started_on: dayKey(), updated_at: new Date().toISOString() }).eq("id", 1);
  revalidatePath("/islam/coran");
  return fail(error);
}

export async function setHifz(surah: number, status: "learning" | "memorized" | null): Promise<Result> {
  if (!(surah >= 1 && surah <= 114)) return { ok: false, error: "invalid" };
  const sb = await createClient();
  const today = dayKey();
  let error;
  if (status === null) ({ error } = await sb.from("islam_hifz").delete().eq("surah", surah));
  else if (status === "learning")
    ({ error } = await sb
      .from("islam_hifz")
      .upsert({ surah, status, started_on: today, memorized_on: null, next_review: null, interval_days: 1, updated_at: new Date().toISOString() }));
  else
    ({ error } = await sb
      .from("islam_hifz")
      .upsert({ surah, status, memorized_on: today, interval_days: 1, next_review: addDays(today, 1), updated_at: new Date().toISOString() }));
  syncLater();
  revalidatePath("/islam/coran");
  return fail(error);
}

export async function reviewHifz(surah: number, quality: "good" | "hard"): Promise<Result> {
  const sb = await createClient();
  const { data, error: e1 } = await sb.from("islam_hifz").select("interval_days, reviews").eq("surah", surah).maybeSingle();
  if (e1 || !data) return { ok: false, error: e1?.message ?? "not_found" };
  const interval = nextInterval(data.interval_days, quality);
  const today = dayKey();
  const { error } = await sb
    .from("islam_hifz")
    .update({ interval_days: interval, next_review: addDays(today, interval), last_review: today, reviews: data.reviews + 1, updated_at: new Date().toISOString() })
    .eq("surah", surah);
  revalidatePath("/islam/coran");
  return fail(error);
}

/* ---------------- Adhkar & dhikr ---------------- */

export async function setAdhkarItems(day: string, period: Period, items: string[]): Promise<Result> {
  if (!isDay(day) || !["morning", "evening"].includes(period)) return { ok: false, error: "invalid" };
  const sb = await createClient();
  const { error } = await sb
    .from("islam_adhkar_logs")
    .upsert({ day, period, items: [...new Set(items)].slice(0, 50), updated_at: new Date().toISOString() });
  const complete = new Set(items).size >= adhkarFor(period).length;
  if (!error) await worshipXp("adhkar", `${day}:${period}`, complete ? 10 : null, period);
  revalidatePath("/islam/adhkar");
  return fail(error);
}

/** Enregistre le total du jour pour un compteur (envoyé par lots depuis le tasbih). */
export async function saveDhikrCount(day: string, counterId: string, count: number): Promise<Result> {
  if (!isDay(day) || !(count >= 0 && count <= 1_000_000)) return { ok: false, error: "invalid" };
  const sb = await createClient();
  const { error } = await sb.from("islam_dhikr_counts").upsert({ day, counter_id: counterId, count: Math.round(count) });
  return fail(error);
}

export async function addDhikrCounter(label: string, arabic: string, target: number): Promise<Result> {
  const l = label.trim().slice(0, 80);
  if (!l || !(target >= 1 && target <= 100000)) return { ok: false, error: "invalid" };
  const sb = await createClient();
  const { error } = await sb.from("islam_dhikr_counters").insert({ label: l, arabic: arabic.trim() || null, target: Math.round(target), sort: 99 });
  revalidatePath("/islam/adhkar");
  return fail(error);
}

export async function deleteDhikrCounter(id: string): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.from("islam_dhikr_counters").delete().eq("id", id);
  revalidatePath("/islam/adhkar");
  return fail(error);
}

/* ---------------- Réglages ---------------- */

export type SettingsInput = {
  first_name: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
  calc_method: string;
  madhab: "shafi" | "hanafi";
  quran_daily_pages: number;
  khatm_days: number;
  no_xp_for_worship: boolean;
  prayer_tune?: Partial<Record<"fajr" | "dhuhr" | "asr" | "maghrib" | "isha", number>>;
  company_name?: string;
  company_address?: string;
  company_email?: string;
  siret?: string;
  vat_number?: string;
  vat_rate?: number;
};

export async function saveSettings(input: SettingsInput): Promise<Result> {
  const valid =
    Math.abs(input.latitude) <= 90 &&
    Math.abs(input.longitude) <= 180 &&
    CALC_METHODS.some((m) => m.id === input.calc_method) &&
    ["shafi", "hanafi"].includes(input.madhab) &&
    input.quran_daily_pages >= 1 &&
    input.quran_daily_pages <= 604 &&
    input.khatm_days >= 1 &&
    input.khatm_days <= 3650 &&
    (input.vat_rate === undefined || (input.vat_rate >= 0 && input.vat_rate <= 30)) &&
    (!input.siret || /^\d{14}$/.test(input.siret.replace(/\s/g, "")));
  if (!valid) return { ok: false, error: "invalid" };
  try {
    new Intl.DateTimeFormat("en", { timeZone: input.timezone });
  } catch {
    return { ok: false, error: "invalid_timezone" };
  }
  const sb = await createClient();
  const { error } = await sb
    .from("dash_settings")
    .update({
      first_name: input.first_name.trim().slice(0, 40),
      city: input.city.trim().slice(0, 80),
      latitude: input.latitude,
      longitude: input.longitude,
      timezone: input.timezone,
      calc_method: input.calc_method,
      madhab: input.madhab,
      quran_daily_pages: Math.round(input.quran_daily_pages),
      khatm_days: Math.round(input.khatm_days),
      no_xp_for_worship: input.no_xp_for_worship,
      prayer_tune: Object.fromEntries(
        (["fajr", "dhuhr", "asr", "maghrib", "isha"] as const).map((k) => [k, Math.max(-30, Math.min(30, Math.round(Number(input.prayer_tune?.[k]) || 0)))]),
      ),
      company_name: (input.company_name ?? "").trim().slice(0, 120),
      company_address: (input.company_address ?? "").trim().slice(0, 300),
      company_email: (input.company_email ?? "").trim().slice(0, 160),
      siret: (input.siret ?? "").replace(/\s/g, ""),
      vat_number: (input.vat_number ?? "").trim().slice(0, 30),
      vat_rate: Math.round((Number(input.vat_rate) || 0) * 100) / 100,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  revalidatePath("/", "layout");
  return fail(error);
}

/* ---------------- Rûh ---------------- */

export async function linkRuh(email: string): Promise<Result> {
  const e = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { ok: false, error: "invalid" };
  const sb = await createClient();
  const { data, error } = await sb.rpc("dashboard_link_ruh", { p_email: e });
  revalidatePath("/", "layout");
  if (error) return { ok: false, error: error.message };
  return data === true ? { ok: true } : { ok: false, error: "not_found" };
}

export async function unlinkRuh(): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.rpc("dashboard_unlink_ruh");
  revalidatePath("/", "layout");
  return fail(error);
}

/** Position exacte de l'appareil (horaires de prière au plus juste). */
export async function savePosition(latitude: number, longitude: number, timezone: string): Promise<Result> {
  if (!(Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180)) return { ok: false, error: "invalid" };
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
  } catch {
    return { ok: false, error: "invalid_timezone" };
  }
  const sb = await createClient();
  const { error } = await sb
    .from("dash_settings")
    .update({
      latitude: Math.round(latitude * 1e5) / 1e5,
      longitude: Math.round(longitude * 1e5) / 1e5,
      timezone,
      city: "Ma position",
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  revalidatePath("/", "layout");
  return fail(error);
}

export type CityResult = { name: string; region: string; country: string; latitude: number; longitude: number; timezone: string };

/** Recherche de ville (géocodage Open-Meteo, sans clé). Seul le nom tapé est envoyé. */
export async function searchCity(query: string, lang: "fr" | "en" = "fr"): Promise<CityResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=${lang}&format=json`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: { name: string; admin1?: string; country?: string; latitude: number; longitude: number; timezone: string }[] };
    return (json.results ?? []).map((r) => ({
      name: r.name,
      region: r.admin1 ?? "",
      country: r.country ?? "",
      latitude: r.latitude,
      longitude: r.longitude,
      timezone: r.timezone,
    }));
  } catch {
    return [];
  }
}
