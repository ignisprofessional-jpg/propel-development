import "server-only";
import { cache } from "react";
import { PRAYER_KEYS, prayerTimesFor, type PrayerKey } from "./prayer-times";
import type { Settings } from "./types";

export type DayTimes = Record<PrayerKey | "sunrise", Date> & { source: "aladhan" | "local" };
export type Tune = Partial<Record<PrayerKey, number>>;

/** Méthodes → identifiants Aladhan (les angles personnalisés passent par methodSettings). */
const ALADHAN: Record<string, { method: number; settings?: string }> = {
  france12: { method: 12 },
  france15: { method: 99, settings: "15,null,15" },
  france18: { method: 99, settings: "18,null,18" },
  mwl: { method: 3 },
  moonsighting: { method: 15 },
  isna: { method: 2 },
  egypt: { method: 5 },
  karachi: { method: 1 },
  ummalqura: { method: 4 },
  dubai: { method: 16 },
  qatar: { method: 10 },
  kuwait: { method: 9 },
  turkey: { method: 13 },
  singapore: { method: 11 },
};

const clampTune = (v: unknown) => Math.max(-30, Math.min(30, Math.round(Number(v) || 0)));

/**
 * Horaires d'un jour. Source principale : l'API Aladhan (même calcul que Rûh),
 * avec les ajustements de minutes. Repli : calcul local (adhan) si l'API ne répond pas.
 * Seules la position de la ville et la méthode sont envoyées.
 */
export const getDayTimes = cache(async (day: string, s: Settings): Promise<DayTimes> => {
  const tune = (s as Settings & { prayer_tune?: Tune }).prayer_tune ?? {};
  const t = (k: PrayerKey) => clampTune(tune[k]);
  try {
    const [y, m, d] = day.split("-");
    const cfg = ALADHAN[s.calc_method] ?? ALADHAN.france12;
    const params = new URLSearchParams({
      latitude: String(s.latitude),
      longitude: String(s.longitude),
      method: String(cfg.method),
      school: s.madhab === "hanafi" ? "1" : "0",
      timezonestring: s.timezone,
      iso8601: "true",
      // Ordre Aladhan : Imsak, Fajr, Sunrise, Dhuhr, Asr, Maghrib, Sunset, Isha, Midnight
      tune: [0, t("fajr"), 0, t("dhuhr"), t("asr"), t("maghrib"), 0, t("isha"), 0].join(","),
    });
    if (cfg.settings) params.set("methodSettings", cfg.settings);
    const res = await fetch(`https://api.aladhan.com/v1/timings/${d}-${m}-${y}?${params}`, {
      next: { revalidate: 60 * 60 * 6 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as { data?: { timings?: Record<string, string> } };
    const tm = json.data?.timings;
    if (!tm) throw new Error("no timings");
    const at = (k: string) => {
      const v = new Date(tm[k]);
      if (Number.isNaN(v.getTime())) throw new Error("bad time");
      return v;
    };
    return { fajr: at("Fajr"), sunrise: at("Sunrise"), dhuhr: at("Dhuhr"), asr: at("Asr"), maghrib: at("Maghrib"), isha: at("Isha"), source: "aladhan" };
  } catch {
    const local = prayerTimesFor(day, s);
    const shift = (k: PrayerKey) => new Date(local[k].getTime() + t(k) * 60_000);
    return { fajr: shift("fajr"), sunrise: local.sunrise, dhuhr: shift("dhuhr"), asr: shift("asr"), maghrib: shift("maghrib"), isha: shift("isha"), source: "local" };
  }
});

/** Prochaine prière (passe au Fajr du lendemain après Isha). */
export async function getNextPrayer(today: string, tomorrow: string, s: Settings, now = new Date()) {
  const times = await getDayTimes(today, s);
  const key = PRAYER_KEYS.find((k) => times[k].getTime() > now.getTime());
  if (key) return { key, at: times[key], times };
  const next = await getDayTimes(tomorrow, s);
  return { key: "fajr" as PrayerKey, at: next.fajr, times };
}
