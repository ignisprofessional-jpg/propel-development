import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { addDays, dayKey, daysBetween } from "@/lib/day";
import { PRAYER_KEYS, type PrayerKey } from "./prayer-times";
import type { Period } from "./adhkar";
import type { DhikrCounter, HifzRow, NaflKind, PrayerStatus, Settings } from "./types";

export type { Settings } from "./types";

const DEFAULT_SETTINGS: Settings = {
  first_name: "",
  city: "Paris",
  latitude: 48.8566,
  longitude: 2.3522,
  timezone: "Europe/Paris",
  calc_method: "france12",
  madhab: "shafi",
  quran_daily_pages: 20,
  khatm_days: 30,
  khatm_started_on: dayKey(),
  no_xp_for_worship: true,
  ruh_user_id: null,
  prayer_tune: {},
  company_name: "",
  company_address: "",
  company_email: "",
  siret: "",
  vat_number: "",
  vat_rate: 20,
};

/** Réglages (mis en cache pour la durée d'une requête). */
export const getSettings = cache(async (): Promise<Settings> => {
  const sb = await createClient();
  const { data } = await sb.from("dash_settings").select("*").eq("id", 1).maybeSingle();
  return data ? ({ ...DEFAULT_SETTINGS, ...data } as Settings) : DEFAULT_SETTINGS;
});


/** Statuts des prières sur une période : { "2026-11-22": { fajr: "on_time", … } }. */
export async function getPrayerLogs(from: string, to: string) {
  const sb = await createClient();
  const { data } = await sb.from("islam_prayer_logs").select("day, prayer, status").gte("day", from).lte("day", to);
  const map: Record<string, Partial<Record<PrayerKey, PrayerStatus>>> = {};
  for (const r of data ?? []) (map[r.day] ??= {})[r.prayer as PrayerKey] = r.status as PrayerStatus;
  return map;
}

export async function getNafl(day: string): Promise<NaflKind[]> {
  const sb = await createClient();
  const { data } = await sb.from("islam_nafl_logs").select("kind").eq("day", day);
  return (data ?? []).map((r) => r.kind as NaflKind);
}

/** Jours consécutifs avec les 5 prières notées (aujourd'hui compte s'il est complet). */
export function prayerStreak(logs: Record<string, Partial<Record<PrayerKey, PrayerStatus>>>, today: string) {
  const full = (d: string) => PRAYER_KEYS.every((k) => logs[d]?.[k]);
  let day = full(today) ? today : addDays(today, -1);
  let n = 0;
  while (full(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

/* ---------------- Coran ---------------- */

export async function getQuran(today: string, settings: Settings) {
  const sb = await createClient();
  const weekStart = addDays(today, -6);
  const from = settings.khatm_started_on < weekStart ? settings.khatm_started_on : weekStart;
  const [{ data: reading }, { data: position }, { data: hifz }] = await Promise.all([
    sb.from("islam_quran_reading").select("id, day, pages, created_at").gte("day", from).order("created_at", { ascending: false }),
    sb.from("islam_quran_position").select("page, surah, updated_at").eq("id", 1).maybeSingle(),
    sb.from("islam_hifz").select("*").order("surah"),
  ]);
  const rows = reading ?? [];
  const sum = (pred: (d: string) => boolean) => rows.filter((r) => pred(r.day)).reduce((a, r) => a + r.pages, 0);
  const byDay: Record<string, number> = {};
  for (const r of rows) byDay[r.day] = (byDay[r.day] ?? 0) + r.pages;

  return {
    todayPages: sum((d) => d === today),
    lastEntry: rows.find((r) => r.day === today) ?? null,
    khatmPages: sum((d) => d >= settings.khatm_started_on),
    khatmDay: daysBetween(settings.khatm_started_on, today) + 1,
    byDay,
    position: position ?? { page: 1, surah: 1, updated_at: null },
    hifz: (hifz ?? []) as HifzRow[],
  };
}


/* ---------------- Adhkar & dhikr ---------------- */

export async function getAdhkar(day: string): Promise<Record<Period, string[]>> {
  const sb = await createClient();
  const { data } = await sb.from("islam_adhkar_logs").select("period, items").eq("day", day);
  const res: Record<Period, string[]> = { morning: [], evening: [] };
  for (const r of data ?? []) res[r.period as Period] = r.items ?? [];
  return res;
}


export async function getDhikr(day: string): Promise<DhikrCounter[]> {
  const sb = await createClient();
  const [{ data: counters }, { data: counts }] = await Promise.all([
    sb.from("islam_dhikr_counters").select("id, label, arabic, target, sort").order("sort").order("created_at"),
    sb.from("islam_dhikr_counts").select("counter_id, count").eq("day", day),
  ]);
  const c = new Map((counts ?? []).map((r) => [r.counter_id, r.count]));
  return (counters ?? []).map((r) => ({ id: r.id, label: r.label, arabic: r.arabic, target: r.target, today: c.get(r.id) ?? 0 }));
}
