import Link from "next/link";
import { ArrowUpRight, Link2Off } from "lucide-react";
import { Badge, Card, CardHead, Kicker, Orb, PageHeader, ProgressBar, ProgressRing, ScrollArea, buttonClass } from "@/components/ui";
import { MobilePanel, MobileTabs } from "@/components/ui/Sheet";
import { getDict, getLocale } from "@/lib/i18n/server";
import { dayKey } from "@/lib/day";
import { format } from "@/lib/i18n/dictionaries";
import { getSettings } from "@/lib/islam/data";
import { getIslamOverview } from "@/lib/islam/progress";
import { getRuhSummary } from "@/lib/ruh/data";
import { RUH_LEVELS, RUH_LINKS, RUH_URL, type RuhLevel } from "@/lib/ruh/catalog";
import o from "./avancee.module.css";

export const metadata = { title: "Mon avancée" };

export default async function IslamOverviewPage() {
  const [t, locale, settings] = await Promise.all([getDict(), getLocale(), getSettings()]);
  const today = dayKey();
  const [ruh, stats] = await Promise.all([getRuhSummary(), getIslamOverview(today, settings)]);
  const tt = t.islam.overview;
  const pct = (v: number) => `${Math.round(v * 100)} %`;
  const date = (iso: string, withTime = false) =>
    new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", withTime ? { dateStyle: "medium", timeStyle: "short" } : { day: "numeric", month: "short" }).format(new Date(iso));

  return (
    <>
      <PageHeader kicker={t.nav.islam} title={t.nav.overview} />
      <MobileTabs tabs={[{ id: "ruh", label: tt.ruh }, { id: "prayers", label: t.nav.prayer }, { id: "quran", label: `${t.nav.quran} · Adhkar` }]}>
      <div className={o.grid}>
        {/* ——— Rûh ——— */}
        <MobilePanel id="ruh">
        <Card variant="hero" className={o.ruh}>
          <Orb className={o.orb} />
          <div className={o.ruhHead}>
            <Kicker onDark>{tt.ruh}</Kicker>
            {ruh ? <span className={o.sync}>{format(tt.lastSync, { date: date(ruh.updatedAt, true) })}</span> : <span className={o.notLinked}><Link2Off size={13} aria-hidden /> {tt.notLinked}</span>}
          </div>

          {ruh ? (
            <>
              <p className={o.level}>
                {tt.level} <strong>{RUH_LEVELS[ruh.level][locale]}</strong>
              </p>
              <div className={o.tiles}>
                <Tile value={`${ruh.lessons.done + ruh.lessons.review}/${ruh.lessons.total}`} label={tt.lessons} sub={ruh.lessons.review ? `${ruh.lessons.review} ${tt.lessonsReview}` : tt.lessonsDone} />
                <Tile value={ruh.surahs.memorized} label={tt.surahs} sub={`${tt.memorized}${ruh.surahs.learning ? ` · ${ruh.surahs.learning} ${tt.learning}` : ""}`} />
                <Tile value={ruh.quizzes.avg === null ? "—" : `${ruh.quizzes.avg} %`} label={tt.quizzes} sub={`${ruh.quizzes.count} · ${tt.quizAvg}`} />
                <Tile value={`${ruh.goals.done}/${ruh.goals.total}`} label={tt.goals} sub={`${ruh.activeDays} ${tt.activeDays}`} />
              </div>
              <div className={o.levels}>
                {(Object.keys(ruh.lessonsByLevel) as RuhLevel[]).map((lv) => (
                  <div key={lv} className={o.levelRow}>
                    <span>{RUH_LEVELS[lv][locale]}</span>
                    <span className={o.levelBar}>
                      <i style={{ width: `${(ruh.lessonsByLevel[lv].done / ruh.lessonsByLevel[lv].total) * 100}%` }} />
                    </span>
                    <span className={o.levelNum}>
                      {ruh.lessonsByLevel[lv].done}/{ruh.lessonsByLevel[lv].total}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className={o.empty}>
              <p>{tt.notLinkedText}</p>
              <Link href="/parametres" className={o.cta}>
                {tt.linkCta}
              </Link>
            </div>
          )}

          <div className={o.links}>
            {RUH_LINKS.map((l) => (
              <a key={l.path} href={`${RUH_URL}${l.path}`} target="_blank" rel="noopener noreferrer" className={o.link}>
                {l[locale]} <ArrowUpRight size={12} aria-hidden />
              </a>
            ))}
          </div>
        </Card>

        </MobilePanel>

        {/* ——— Prières ——— */}
        <MobilePanel id="prayers">
        <Card fill className={o.prayers}>
          <CardHead title={tt.prayers} />
          <div className={o.prayerTop}>
            <ProgressRing value={stats.prayers.ratio} size={112} stroke={11} />
            <div className={o.prayerNums}>
              <p><strong>{pct(stats.prayers.ratio)}</strong> {tt.logged}</p>
              <p><strong>{pct(stats.prayers.onTimeRatio)}</strong> {tt.onTime}</p>
              <p><strong>{stats.prayers.streak}</strong> {tt.streak}</p>
            </div>
          </div>
          <div className={o.heat} aria-label={tt.prayers}>
            {stats.prayers.heat.map((h) => (
              <i key={h.day} data-n={h.n} title={`${date(h.day + "T12:00:00Z")} · ${h.n}/5`} />
            ))}
          </div>
        </Card>

        </MobilePanel>

        {/* ——— Dernières leçons Rûh ——— */}
        <MobilePanel id="ruh">
        <Card fill>
          <CardHead title={tt.recent} />
          {ruh && ruh.recentLessons.length > 0 ? (
            <ScrollArea>
              <ul className={o.lessons}>
                {ruh.recentLessons.map((l) => (
                  <li key={l.id}>
                    <a href={`${RUH_URL}/cours/${l.id}`} target="_blank" rel="noopener noreferrer" className={o.lesson}>
                      <span className={o.lessonTitle}>{l.title}</span>
                      <span className={o.lessonMeta}>
                        <Badge tone={l.status === "review" ? "outline" : ["done", "completed", "complete", "finished", "mastered", "learned"].includes(l.status) ? "solid" : "soft"}>
                          {l.status === "review" ? tt.status.review : ["done", "completed", "complete", "finished", "mastered", "learned"].includes(l.status) ? tt.status.done : tt.status.other}
                        </Badge>
                        {l.at && <span className={o.lessonDate}>{date(l.at)}</span>}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <p className={o.muted}>{ruh ? tt.noLessons : tt.notLinkedText}</p>
          )}
        </Card>

        </MobilePanel>

        {/* ——— Coran ——— */}
        <MobilePanel id="quran">
        <Card fill>
          <CardHead title={tt.quran} action={<Link href="/islam/coran" className={buttonClass("ghost", "sm")}>{tt.open}</Link>} />
          <div className={o.stats}>
            <Stat value={stats.quran.week} label={tt.pagesWeek} />
            <Stat value={stats.quran.month} label={tt.pagesMonth} />
            <Stat value={stats.quran.memorized} label={tt.memorizedSurahs} sub={stats.quran.due ? `${stats.quran.due} ${tt.toReview}` : undefined} />
            <Stat value={pct(stats.quran.khatm)} label={tt.khatm} />
          </div>
          <ProgressBar value={stats.quran.khatm} />
        </Card>

        {/* ——— Adhkar ——— */}
        <Card fill>
          <CardHead title={tt.adhkar} action={<Link href="/islam/adhkar" className={buttonClass("ghost", "sm")}>{tt.open}</Link>} />
          <div className={o.stats}>
            <Stat value={`${stats.adhkar.morning}/7`} label={tt.morningDone} />
            <Stat value={`${stats.adhkar.evening}/7`} label={tt.eveningDone} />
          </div>
          <div className={o.adhkarBars}>
            <ProgressBar value={stats.adhkar.morning / 7} />
            <ProgressBar value={stats.adhkar.evening / 7} />
          </div>
        </Card>
        </MobilePanel>
      </div>
      </MobileTabs>
    </>
  );
}

function Tile({ value, label, sub }: { value: React.ReactNode; label: string; sub?: string }) {
  return (
    <div className={o.tile}>
      <span className={o.tileLabel}>{label}</span>
      <span className={o.tileValue}>{value}</span>
      {sub && <span className={o.tileSub}>{sub}</span>}
    </div>
  );
}

function Stat({ value, label, sub }: { value: React.ReactNode; label: string; sub?: string }) {
  return (
    <div className={o.stat}>
      <span className={o.statValue}>{value}</span>
      <span className={o.statLabel}>{label}</span>
      {sub && <span className={o.statSub}>{sub}</span>}
    </div>
  );
}
