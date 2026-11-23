import { NextResponse } from "next/server";
import { hasValidSession } from "@/lib/supabase/server";
import { getSettings } from "@/lib/islam/data";
import { getDayTimes } from "@/lib/islam/times";
import { PRAYER_KEYS, PRAYER_NAMES } from "@/lib/islam/prayer-times";
import { addDays, dayKey } from "@/lib/day";

/** Horaires d'aujourd'hui et de demain, pour programmer les rappels de prière dans le navigateur. */
export async function GET() {
  if (!(await hasValidSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const settings = await getSettings();
  const today = dayKey();
  const days = await Promise.all([today, addDays(today, 1)].map((d) => getDayTimes(d, settings)));
  const prayers = days.flatMap((t) => PRAYER_KEYS.map((k) => ({ key: k, name: PRAYER_NAMES[k].label, at: t[k].toISOString() })));
  return NextResponse.json({ city: settings.city, prayers }, { headers: { "Cache-Control": "private, no-store" } });
}
