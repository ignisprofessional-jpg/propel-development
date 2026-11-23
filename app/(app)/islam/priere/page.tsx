import Link from "next/link";
import { MapPin } from "lucide-react";
import { Badge, Card, CardHead, Kicker, Orb, PageHeader, ScrollArea } from "@/components/ui";
import { MobilePanel, MobileTabs, MobileTabsBar } from "@/components/ui/Sheet";
import { upcomingIslamicDays } from "@/lib/islam/calendar";
import { LocateButton } from "@/components/islam/LocateButton";
import { Countdown } from "@/components/home/Countdown";
import { getDict, getLocale } from "@/lib/i18n/server";
import { addDays, dayKey, lastDays, weekdayShort } from "@/lib/day";
import { format } from "@/lib/i18n/dictionaries";
import { CALC_METHODS, PRAYER_KEYS, PRAYER_NAMES, formatTime } from "@/lib/islam/prayer-times";
import { getNextPrayer } from "@/lib/islam/times";
import { getNafl, getPrayerLogs, getSettings, prayerStreak } from "@/lib/islam/data";
import { PrayerToday, NaflChips } from "./PrayerToday";
import s from "../islam.module.css";

export const metadata = { title: "Prière" };

export default async function PrayerPage() {
  const [t, locale, settings] = await Promise.all([getDict(), getLocale(), getSettings()]);
  const today = dayKey();
  const now = new Date();
  const [logs, nafl] = await Promise.all([getPrayerLogs(addDays(today, -180), today), getNafl(today)]);

  const next = await getNextPrayer(today, addDays(today, 1), settings, now);
  const times = next.times;
  const tz = settings.timezone;
  const streak = prayerStreak(logs, today);
  const week = lastDays(7, today);
  const methodLabel = CALC_METHODS.find((m) => m.id === settings.calc_method)?.label ?? settings.calc_method;
  const doneToday = PRAYER_KEYS.filter((k) => logs[today]?.[k]).length;
  const upcoming = upcomingIslamicDays(today, locale);
  const fmtDay = (d: string) =>
    new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));
  const when = (n: number) => (n === 0 ? t.islam.prayer.today : n === 1 ? t.islam.prayer.tomorrow : format(t.islam.prayer.inDays, { n }));

  const rows = PRAYER_KEYS.map((k) => ({
    key: k,
    time: formatTime(times[k], tz),
    upcoming: times[k].getTime() > now.getTime(),
    current: next.key === k && next.at.getTime() === times[k].getTime(),
  }));

  return (
    <>
      <PageHeader kicker={t.nav.islam} title={t.nav.prayer} sub={format(t.islam.prayer.done, { n: doneToday })} />
      <MobileTabs bar={false} tabs={[{ id: "today", label: t.islam.prayer.today }, { id: "sunna", label: "Sunna" }, { id: "week", label: locale === "fr" ? "7 jours" : "7 days" }, { id: "cal", label: t.islam.prayer.calendar }]}>
      <div className={s.grid2}>
        <div className={s.col}>
          <Card variant="hero" className={s.hero}>
            <Orb className={s.heroOrb} />
            <div>
              <Kicker onDark>{t.islam.prayer.next}</Kicker>
              <p className={s.nextName}>
                {PRAYER_NAMES[next.key].label}
                <span className={s.nextArabic} lang="ar">
                  {PRAYER_NAMES[next.key].arabic}
                </span>
              </p>
              <p className={s.nextMeta}>
                {formatTime(next.at, tz)} · <Countdown to={next.at.toISOString()} prefix={t.islam.prayer.in} />
              </p>
            </div>
            <div className={s.heroRow}>
              <p className={s.place}>
                <MapPin size={14} aria-hidden />
                {settings.city === "Ma position" ? t.islam.prayer.myPosition : settings.city} · {methodLabel} · <Link href="/parametres">{t.islam.prayer.change}</Link>
                <LocateButton className={s.locate} compact />
              </p>
              <div className={s.streak}>
                {streak > 0 && <p className={s.streakNum}>{streak}</p>}
                <p className={s.streakText}>{streak > 0 ? t.islam.prayer.streak : t.islam.prayer.streakZero}</p>
              </div>
            </div>
          </Card>

          <MobileTabsBar />
          <MobilePanel id="today">
          <Card fill>
            <CardHead title={t.islam.prayer.today} action={<span className={s.subtle}>{t.islam.prayer.sunrise} · {formatTime(times.sunrise, tz)}</span>} />
            <ScrollArea>
              <PrayerToday day={today} rows={rows} initial={logs[today] ?? {}} />
            </ScrollArea>
          </Card>
          </MobilePanel>
        </div>

        <div className={`${s.col} ${s.col3}`}>
          <MobilePanel id="week">
          <Card>
            <CardHead title={t.islam.prayer.week} />
            <div className={s.week}>
              <span />
              {week.map((d) => (
                <span key={d} className={`${s.weekHead} ${d === today ? s.weekToday : ""}`}>
                  {weekdayShort(d, locale).replace(".", "")}
                </span>
              ))}
              {PRAYER_KEYS.map((k) => (
                <WeekRow key={k} label={PRAYER_NAMES[k].label} cells={week.map((d) => logs[d]?.[k] ?? null)} />
              ))}
            </div>
            <div className={s.legend}>
              <span><i className={s.dot} data-s="on_time" /> {t.islam.prayer.status.on_time}</span>
              <span><i className={s.dot} data-s="late" /> {t.islam.prayer.status.late}</span>
              <span><i className={s.dot} data-s="qada" /> {t.islam.prayer.status.qada}</span>
            </div>
          </Card>
          </MobilePanel>

          <MobilePanel id="cal">
          <Card fill>
            <CardHead title={t.islam.prayer.calendar} />
            <ScrollArea>
              <ul className={s.days}>
                {upcoming.map((u) => (
                  <li key={u.day + u.label} className={s.dayItem} data-today={u.inDays === 0 ? "" : undefined}>
                    <span className={s.dayWhen}>{when(u.inDays)}</span>
                    <span className={s.dayBody}>
                      <span className={s.dayLabel}>{u.label}</span>
                      <span className={s.dayMeta}>
                        {fmtDay(u.day)}
                        {u.endDay ? ` · ${format(t.islam.prayer.until, { date: fmtDay(u.endDay) })}` : ""} · {u.hijri}
                      </span>
                    </span>
                    {u.fast && <Badge tone="outline">{t.islam.prayer.fast}</Badge>}
                  </li>
                ))}
              </ul>
              <p className={s.calNote}>{t.islam.prayer.calendarNote}</p>
            </ScrollArea>
          </Card>
          </MobilePanel>

          <MobilePanel id="sunna">
          <Card>
            <CardHead title={t.islam.prayer.nafl} />
            <NaflChips day={today} initial={nafl} />
          </Card>
          </MobilePanel>
        </div>
      </div>
      </MobileTabs>
    </>
  );
}

function WeekRow({ label, cells }: { label: string; cells: (string | null)[] }) {
  return (
    <>
      <span className={s.weekLabel}>{label}</span>
      {cells.map((c, i) => (
        <i key={i} className={s.dot} data-s={c ?? undefined} />
      ))}
    </>
  );
}
