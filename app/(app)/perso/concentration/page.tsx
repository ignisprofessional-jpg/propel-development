import { Card, CardHead, PageHeader, ScrollArea } from "@/components/ui";
import { MobilePanel, MobileTabs } from "@/components/ui/Sheet";
import { getDict, getLocale } from "@/lib/i18n/server";
import { dayKey, lastDays, weekdayShort } from "@/lib/day";
import { formatDuration } from "@/lib/dates";
import { getFocus, getTasks } from "@/lib/perso/data";
import { FocusTimer, SessionDelete } from "./FocusTimer";
import s from "../perso.module.css";

export const metadata = { title: "Concentration" };

export default async function FocusPage() {
  const [t, locale, sessions, tasks] = await Promise.all([getDict(), getLocale(), getFocus(30), getTasks({ includeDoneSince: dayKey() })]);
  const today = dayKey();
  const tz = process.env.NEXT_PUBLIC_APP_TIMEZONE || "Europe/Paris";
  const dayOf = (iso: string) => dayKey(new Date(iso), tz);
  const week = lastDays(7, today);
  const byDay: Record<string, number> = {};
  for (const x of sessions) byDay[dayOf(x.started_at)] = (byDay[dayOf(x.started_at)] ?? 0) + x.minutes;
  const max = Math.max(30, ...week.map((d) => byDay[d] ?? 0));
  const fmtTime = (iso: string) =>
    new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(iso));
  const open = tasks.filter((x) => x.status !== "done").map((x) => ({ id: x.id, title: x.title }));

  return (
    <>
      <PageHeader kicker={t.nav.personal} title={t.nav.focus} />
      <MobileTabs tabs={[{ id: "timer", label: t.nav.focus }, { id: "history", label: t.perso.focus.sessions }]}>
      <div className={s.grid2}>
        <MobilePanel id="timer">
          <FocusTimer tasks={open} />
        </MobilePanel>
        <div className={s.col}>
          <MobilePanel id="history">
          <Card>
            <CardHead title={t.perso.focus.week} action={<span className={s.subtle}>{t.perso.focus.today} · {formatDuration(byDay[today] ?? 0)}</span>} />
            <div className={s.bars}>
              {week.map((d) => {
                const v = byDay[d] ?? 0;
                return (
                  <div key={d} className={s.barCol} title={formatDuration(v)}>
                    <span className={s.barVal}>{v ? formatDuration(v) : ""}</span>
                    <span className={s.barTrack}>
                      <i style={{ height: `${(v / max) * 100}%` }} />
                    </span>
                    <span className={s.barDay}>{weekdayShort(d, locale).replace(".", "")}</span>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card fill>
            <CardHead title={t.perso.focus.sessions} />
            <ScrollArea>
              {sessions.length === 0 ? (
                <p className={s.empty}>{t.perso.focus.empty}</p>
              ) : (
                <ul className={s.sessions}>
                  {sessions.map((x) => (
                    <li key={x.id}>
                      <span className={s.sessionLabel}>{x.label || (x.mode === "pomodoro" ? t.perso.focus.pomodoro : t.perso.focus.free)}</span>
                      <span className={s.sessionMeta}>
                        {x.minutes} {t.perso.focus.minutes} · {fmtTime(x.started_at)}
                      </span>
                      <SessionDelete id={x.id} />
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </Card>
          </MobilePanel>
        </div>
      </div>
      </MobileTabs>
    </>
  );
}
