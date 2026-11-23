import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDays, lastDays } from "@/lib/day";
import { PRAYER_KEYS } from "./prayer-times";
import { adhkarFor } from "./adhkar";
import { getPrayerLogs, prayerStreak, type Settings } from "./data";
import { QURAN_PAGES } from "./surahs";

/** Chiffres de la page « Mon avancée » (30 derniers jours). */
export async function getIslamOverview(today: string, settings: Settings) {
  const sb = await createClient();
  const from30 = addDays(today, -29);
  const from7 = addDays(today, -6);
  const [logs, { data: reading }, { data: hifz }, { data: adhkar }] = await Promise.all([
    getPrayerLogs(addDays(today, -180), today),
    sb.from("islam_quran_reading").select("day, pages").gte("day", from30 < settings.khatm_started_on ? from30 : settings.khatm_started_on),
    sb.from("islam_hifz").select("status, next_review"),
    sb.from("islam_adhkar_logs").select("day, period, items").gte("day", from7),
  ]);

  const days30 = lastDays(30, today);
  const heat = days30.map((d) => ({ day: d, n: PRAYER_KEYS.filter((k) => logs[d]?.[k]).length }));
  const logged = heat.reduce((a, h) => a + h.n, 0);
  let onTime = 0;
  for (const d of days30) for (const k of PRAYER_KEYS) if (logs[d]?.[k] === "on_time") onTime++;

  const rows = reading ?? [];
  const pagesSince = (d: string) => rows.filter((r) => r.day >= d).reduce((a, r) => a + r.pages, 0);
  const morningTotal = adhkarFor("morning").length;
  const eveningTotal = adhkarFor("evening").length;
  const adhkarRows = adhkar ?? [];

  return {
    prayers: {
      heat,
      ratio: logged / (30 * 5),
      onTimeRatio: logged ? onTime / logged : 0,
      streak: prayerStreak(logs, today),
    },
    quran: {
      week: pagesSince(from7),
      month: pagesSince(from30),
      khatm: Math.min(1, pagesSince(settings.khatm_started_on) / QURAN_PAGES),
      memorized: (hifz ?? []).filter((h) => h.status === "memorized").length,
      learning: (hifz ?? []).filter((h) => h.status === "learning").length,
      due: (hifz ?? []).filter((h) => h.status === "memorized" && h.next_review && h.next_review <= today).length,
    },
    adhkar: {
      morning: adhkarRows.filter((r) => r.period === "morning" && (r.items?.length ?? 0) >= morningTotal).length,
      evening: adhkarRows.filter((r) => r.period === "evening" && (r.items?.length ?? 0) >= eveningTotal).length,
    },
  };
}
