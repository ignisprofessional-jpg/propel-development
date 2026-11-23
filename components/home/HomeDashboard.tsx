import Link from "next/link";
import { BookOpen, Check, ListChecks, Moon, Timer } from "lucide-react";
import { format } from "@/lib/i18n/dictionaries";
import { formatDuration } from "@/lib/dates";
import { Card, Kicker, Orb, ProgressRing, StatCard } from "@/components/ui";
import type { Dict, Locale } from "@/lib/i18n/dictionaries";
import type { HomeData } from "@/lib/home";
import { Countdown } from "./Countdown";
import s from "./home.module.css";

type Props = { t: Dict; locale: Locale; gregorian: string; hijri: string; data: HomeData };

export function HomeDashboard({ t, gregorian, hijri, data }: Props) {
  const name = data.firstName;
  const goalRatio = data.goals.reduce((a, g) => a + Math.min(1, g.done / g.total), 0) / data.goals.length;

  return (
    <div className={s.home}>
      {/* ——— Héros : salutation + prochaine prière ——— */}
      <Card variant="hero" className={s.hero}>
        <Orb className={s.orb} />
        <div className={s.heroTop}>
          <p className={s.date}>
            {gregorian} <span aria-hidden>·</span> {hijri}
          </p>
          {data.nextIslamicDay && (
            <Link href="/islam/priere" className={s.dayChip}>
              <Moon size={13} aria-hidden />
              <span>{data.nextIslamicDay.label}</span>
              <span className={s.dayChipWhen}>
                {data.nextIslamicDay.inDays === 0
                  ? t.islam.prayer.today
                  : data.nextIslamicDay.inDays === 1
                    ? t.islam.prayer.tomorrow
                    : format(t.islam.prayer.inDays, { n: data.nextIslamicDay.inDays })}
              </span>
            </Link>
          )}
        </div>

        <div className={s.greet}>
          <span className={s.arabic} lang="ar" dir="rtl">
            السَّلَامُ عَلَيْكُمْ
          </span>
          <h1 className={s.title} data-intro-target>
            {t.home.greeting}
            {name && <span className={s.name}>, {name}</span>}
          </h1>
        </div>

        <div className={s.prayerBlock}>
          <div className={s.next}>
            <Kicker onDark>{t.home.nextPrayer}</Kicker>
            <p className={s.nextName}>
              {data.nextPrayer.name} <span className={s.nextTime}>{data.nextPrayer.time}</span>
            </p>
            <p className={s.nextIn}>
              <Countdown to={data.nextPrayer.at} prefix={t.home.in} />
            </p>
          </div>
          <ol className={s.prayers} aria-label={t.home.goals.prayers}>
            {data.prayers.map((p) => (
              <li key={p.name} className={s.prayer} data-done={p.done ? "" : undefined} data-current={p.current ? "" : undefined}>
                <span className={s.prayerDot}>{p.done && <Check size={12} strokeWidth={3} aria-hidden />}</span>
                <span className={s.prayerName}>{p.name}</span>
                <span className={s.prayerTime}>{p.time}</span>
              </li>
            ))}
          </ol>
        </div>
      </Card>

      {/* ——— Objectif du jour ——— */}
      <Card variant="hero" className={s.goal}>
        <Kicker onDark>{t.home.dailyGoal}</Kicker>
        <div className={s.ringWrap}>
          <ProgressRing value={goalRatio} size={152} stroke={14} color="#fff" />
        </div>
        <ul className={s.goalList}>
          {data.goals.map((g) => (
            <li key={g.key}>
              <span className={s.goalLabel}>{t.home.goals[g.key]}</span>
              <span className={s.goalBar} aria-hidden>
                <i style={{ width: `${Math.min(100, (g.done / g.total) * 100)}%` }} />
              </span>
              <span className={s.goalValue}>
                {g.done}/{g.total}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {/* ——— Chiffres : deux sous le héros, un sous l'objectif ——— */}
      <div className={s.statsLeft}>
        <StatCard compact icon={BookOpen} label={t.home.quran} value={data.quranWeek} unit={t.home.pages} foot={t.home.quranSub} />
        <StatCard compact icon={Timer} label={t.home.focus} value={formatDuration(data.focusToday)} foot={t.home.focusSub} />
      </div>
      <StatCard compact icon={ListChecks} label={t.home.tasksCard} value={`${data.tasksToday.done}/${data.tasksToday.total}`} foot={t.home.tasksSub} />

    </div>
  );
}
