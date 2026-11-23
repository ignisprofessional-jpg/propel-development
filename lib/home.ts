import "server-only";
import { addDays, dayKey } from "@/lib/day";
import { getPrayerLogs, getQuran, getSettings } from "@/lib/islam/data";
import { getFocus, getHabits, getTasks, habitsDueToday } from "@/lib/perso/data";
import { minutesNowInTz } from "@/lib/dates";
import { PRAYER_KEYS, PRAYER_NAMES, formatTime } from "@/lib/islam/prayer-times";
import { getNextPrayer } from "@/lib/islam/times";
import { upcomingIslamicDays, type IslamicDay } from "@/lib/islam/calendar";
import { getLocale } from "@/lib/i18n/server";

/** Données de l'accueil — uniquement des données réelles. */
export type HomeGoal = { key: "prayers" | "quran" | "habits" | "tasks"; done: number; total: number };
export type HomeData = {
  firstName: string;
  prayers: { name: string; time: string; done: boolean; current: boolean }[];
  nextPrayer: { name: string; time: string; at: string };
  goals: HomeGoal[];
  quranWeek: number;
  focusToday: number;
  tasksToday: { done: number; total: number };
  nextIslamicDay: IslamicDay | null;
};

export async function getHomeData(): Promise<HomeData> {
  const settings = await getSettings();
  const today = dayKey();
  const now = new Date();
  const [logs, quran, habits, tasks, focus] = await Promise.all([
    getPrayerLogs(today, today),
    getQuran(today, settings),
    getHabits(7),
    getTasks({ includeDoneSince: today }),
    getFocus(2),
  ]);

  const next = await getNextPrayer(today, addDays(today, 1), settings, now);
  const times = next.times;
  const tz = settings.timezone;
  const prayers = PRAYER_KEYS.map((k) => ({
    name: PRAYER_NAMES[k].label,
    time: formatTime(times[k], tz),
    done: !!logs[today]?.[k],
    current: next.key === k && next.at.getTime() === times[k].getTime(),
  }));

  const weekStart = addDays(today, -6);
  const habitsToday = habitsDueToday(habits, today);
  // Tâches du jour : prévues aujourd'hui, en retard, ou faites aujourd'hui
  const todays = tasks.filter((t) => (t.status !== "done" && t.due_date && t.due_date <= today) || (t.status === "done" && t.done_at && t.done_at.slice(0, 10) === today));
  const tasksDone = todays.filter((t) => t.status === "done").length;
  // Concentration du jour (dans le fuseau de l'app) : sessions commencées depuis minuit
  const midnight = Date.now() - minutesNowInTz() * 60_000 - 60_000;
  const focusToday = focus.filter((f) => new Date(f.started_at).getTime() >= midnight).reduce((a, f) => a + f.minutes, 0);

  return {
    firstName: settings.first_name,
    prayers,
    nextPrayer: { name: PRAYER_NAMES[next.key].label, time: formatTime(next.at, tz), at: next.at.toISOString() },
    goals: [
      { key: "prayers", done: prayers.filter((p) => p.done).length, total: 5 },
      { key: "quran", done: quran.todayPages, total: settings.quran_daily_pages },
      { key: "habits", done: habitsToday.done, total: Math.max(1, habitsToday.total) },
      { key: "tasks", done: tasksDone, total: Math.max(1, todays.length) },
    ],
    quranWeek: Object.entries(quran.byDay).filter(([d]) => d >= weekStart).reduce((a, [, n]) => a + n, 0),
    focusToday,
    tasksToday: { done: tasksDone, total: todays.length },
    nextIslamicDay: upcomingIslamicDays(today, await getLocale(), 60, 1)[0] ?? null,
  };
}
