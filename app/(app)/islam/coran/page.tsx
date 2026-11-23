import { Card, CardHead, Kicker, PageHeader, ProgressBar, ProgressRing } from "@/components/ui";
import { MobilePanel, MobileTabs, MobileTabsBar } from "@/components/ui/Sheet";
import { getDict, getLocale } from "@/lib/i18n/server";
import { dayKey, lastDays, weekdayShort } from "@/lib/day";
import { format } from "@/lib/i18n/dictionaries";
import { getQuran, getSettings } from "@/lib/islam/data";
import { QURAN_PAGES } from "@/lib/islam/surahs";
import { QuranAdd, PositionForm, RestartKhatm, HifzList } from "./QuranClient";
import s from "../islam.module.css";
import q from "./coran.module.css";

export const metadata = { title: "Coran" };

export default async function QuranPage() {
  const [t, locale, settings] = await Promise.all([getDict(), getLocale(), getSettings()]);
  const today = dayKey();
  const data = await getQuran(today, settings);
  const goal = settings.quran_daily_pages;

  const perDay = QURAN_PAGES / settings.khatm_days;
  // Rythme attendu à la fin d'hier : la journée en cours n'est pas encore « due ».
  const expected = Math.min(QURAN_PAGES, Math.round((data.khatmDay - 1) * perDay));
  const diff = data.khatmPages - expected;
  const rhythm =
    Math.abs(diff) < Math.max(2, perDay / 2)
      ? t.islam.quran.onTrack
      : diff < 0
        ? format(t.islam.quran.behind, { n: -diff })
        : format(t.islam.quran.ahead, { n: diff });

  const week = lastDays(7, today);
  const maxWeek = Math.max(goal, ...week.map((d) => data.byDay[d] ?? 0));
  const ruh = process.env.NEXT_PUBLIC_RUH_URL ?? "https://ruh-apprentissage.netlify.app";

  return (
    <>
      <PageHeader kicker={t.nav.islam} title={t.nav.quran} sub={format(t.islam.quran.goal, { n: goal })} />
      <MobileTabs bar={false} tabs={[{ id: "hifz", label: t.islam.quran.hifz }, { id: "khatm", label: "Khatm" }, { id: "pos", label: "Position" }]}>
      <div className={s.grid2}>
        <div className={s.col}>
          <Card variant="hero" className={q.today}>
            <div className={q.todayTop}>
              <ProgressRing value={data.todayPages / goal} size={132} stroke={12} color="#fff">
                <span className={q.ringNum}>{data.todayPages}</span>
                <span className={q.ringLabel}>/ {goal} {t.islam.quran.pages}</span>
              </ProgressRing>
              <div className={q.todayText}>
                <Kicker onDark>{t.islam.quran.today}</Kicker>
                <QuranAdd lastEntryId={data.lastEntry?.id ?? null} />
              </div>
            </div>
          </Card>

          <MobileTabsBar />
          <MobilePanel id="hifz">
          <Card fill>
            <CardHead title={t.islam.quran.hifz} />
            <HifzList rows={data.hifz} today={today} locale={locale} />
          </Card>
          </MobilePanel>
        </div>

        <div className={`${s.col} ${s.col3}`}>
          <MobilePanel id="khatm">
          <Card>
            <CardHead title={t.islam.quran.khatm} action={<RestartKhatm />} />
            <div className={s.stack}>
              <div className={s.between}>
                <span className={s.big}>{format(t.islam.quran.khatmProgress, { done: Math.min(QURAN_PAGES, data.khatmPages) })}</span>
                <span className={s.subtle}>{format(t.islam.quran.khatmDay, { day: data.khatmDay, days: settings.khatm_days })}</span>
              </div>
              <ProgressBar value={data.khatmPages / QURAN_PAGES} />
              <p className={s.muted}>{rhythm}</p>
            </div>
          </Card>

          <Card fill>
            <CardHead title={t.islam.quran.week} />
            <div className={q.bars}>
              {week.map((d) => {
                const v = data.byDay[d] ?? 0;
                return (
                  <div key={d} className={q.barCol}>
                    <span className={q.barVal}>{v || ""}</span>
                    <span className={q.barTrack}>
                      <i style={{ height: `${(v / maxWeek) * 100}%` }} data-goal={v >= goal ? "" : undefined} />
                    </span>
                    <span className={`${q.barDay} ${d === today ? q.barToday : ""}`}>{weekdayShort(d, locale).replace(".", "")}</span>
                  </div>
                );
              })}
            </div>
          </Card>
          </MobilePanel>

          <MobilePanel id="pos">
          <Card>
            <CardHead title={t.islam.quran.position} />
            <PositionForm page={data.position.page} surah={data.position.surah} ruhUrl={ruh} />
          </Card>
          </MobilePanel>
        </div>
      </div>
      </MobileTabs>
    </>
  );
}
