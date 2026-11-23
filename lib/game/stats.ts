import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDays, dayKey, lastDays } from "@/lib/day";
import { adhkarFor } from "@/lib/islam/adhkar";
import { getXpByDay } from "./data";

export type Series = Record<string, number>;

/** Séries jour par jour sur 12 mois (prières notées, pages de Coran, XP) + séries de jours. */
export async function getStatsData() {
  const today = dayKey();
  const from = addDays(today, -364);
  const sb = await createClient();
  const [{ data: prayers }, { data: reading }, { data: adhkar }, xp] = await Promise.all([
    sb.from("islam_prayer_logs").select("day").gte("day", from),
    sb.from("islam_quran_reading").select("day, pages").gte("day", from),
    sb.from("islam_adhkar_logs").select("day, period, items").gte("day", from),
    getXpByDay(from + "T00:00:00Z"),
  ]);

  const prayerSeries: Series = {};
  for (const r of prayers ?? []) prayerSeries[r.day] = (prayerSeries[r.day] ?? 0) + 1;
  const quranSeries: Series = {};
  for (const r of reading ?? []) quranSeries[r.day] = (quranSeries[r.day] ?? 0) + r.pages;
  const adhkarDays = new Set(
    (adhkar ?? []).filter((r) => (r.items?.length ?? 0) >= adhkarFor(r.period as "morning" | "evening").length).map((r) => r.day),
  );

  const days = lastDays(365, today);
  const streak = (ok: (d: string) => boolean) => {
    let current = 0;
    let best = 0;
    let run = 0;
    for (const d of days) {
      run = ok(d) ? run + 1 : 0;
      best = Math.max(best, run);
    }
    // Série en cours : aujourd'hui compte s'il est validé, sinon on part d'hier
    let i = days.length - 1;
    if (!ok(days[i])) i--;
    while (i >= 0 && ok(days[i])) {
      current++;
      i--;
    }
    return { current, best };
  };

  return {
    today,
    days,
    series: { prayers: prayerSeries, quran: quranSeries, xp },
    streaks: {
      prayers: streak((d) => (prayerSeries[d] ?? 0) >= 5),
      quran: streak((d) => (quranSeries[d] ?? 0) > 0),
      adhkar: streak((d) => adhkarDays.has(d)),
    },
  };
}
