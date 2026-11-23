import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { Card, CardHead, Kicker, Orb, PageHeader, ProgressBar, ScrollArea } from "@/components/ui";
import { RankInsignia } from "@/components/brand/Marks";
import { MobilePanel, MobileTabs, MobileTabsBar } from "@/components/ui/Sheet";
import { getDict, getLocale } from "@/lib/i18n/server";
import { milestoneLabel } from "@/lib/game/tree";
import { format } from "@/lib/i18n/dictionaries";
import { getSettings } from "@/lib/islam/data";
import { getMilestoneCount, getRecentXp, getTotals } from "@/lib/game/data";
import { RANKS, levelFromXp, rankForLevel } from "@/lib/game/ranks";
import p from "./profile.module.css";

export const metadata = { title: "Profil" };

export default async function ProfilePage() {
  const [t, locale, settings, totals, counts, history] = await Promise.all([getDict(), getLocale(), getSettings(), getTotals(), getMilestoneCount(), getRecentXp()]);
  const fmt = (iso: string) => new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short" }).format(new Date(iso));
  const lvl = levelFromXp(totals.xp);
  const rank = rankForLevel(lvl.level);
  const rankIndex = RANKS.indexOf(rank);
  const name = settings.first_name.trim();

  return (
    <>
      <PageHeader kicker={t.nav.game} title={t.nav.profile} />
      <MobileTabs bar={false} tabs={[{ id: "history", label: t.profile.history }, { id: "ranks", label: t.profile.ranks }]}>
      <div className={p.grid}>
        <div className={p.left}>
        <Card variant="hero" className={p.hero}>
          <Orb className={p.orb} />
          <div className={p.identity}>
            <span className={p.avatar}>{name ? name.charAt(0).toUpperCase() : "·"}</span>
            <div>
              <h2 className={p.name}>{name || <Link href="/parametres" className={p.addName}>{t.profile.noName}</Link>}</h2>
              <p className={p.rankLine}>
                <span className={p.insignia}><RankInsignia rank={rankIndex} size={22} /></span>
                {rank.name[locale]} · {format(t.profile.level, { n: lvl.level })}
              </p>
            </div>
          </div>
          <div className={p.xp}>
            <div className={p.xpHead}>
              <Kicker onDark>{t.game.xp}</Kicker>
              <span className={p.xpNums}>{lvl.xpInLevel} / {lvl.xpNeeded}</span>
            </div>
            <ProgressBar value={lvl.progress} />
            <p className={p.xpText}>{format(t.profile.xpToNext, { n: lvl.xpNeeded - lvl.xpInLevel })}</p>
          </div>
          <div className={p.counts}>
            <Count value={totals.xp} label={t.profile.totalXp} />
            <Count value={`${counts.done}/${counts.total}`} label={t.profile.milestones} />
            <Count value={lvl.level} label={t.game.level} />
          </div>
        </Card>
        <MobileTabsBar />
        <MobilePanel id="history">
        <Card fill>
          <CardHead title={t.profile.history} />
          <ScrollArea>
            {history.length === 0 ? (
              <p className={p.empty}>{t.profile.noHistory}</p>
            ) : (
              <ul className={p.history}>
                {history.map((h) => (
                  <li key={h.id}>
                    <span className={p.historyLabel}>{(h.source === "milestone" && milestoneLabel(h.label, locale)) || h.label || h.source}</span>
                    <span className={p.historyMeta}>
                      {h.amount > 0 ? "+" : ""}{h.amount} XP · {fmt(h.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </Card>
        </MobilePanel>
        </div>

        <MobilePanel id="ranks">
        <Card fill>
          <CardHead title={t.profile.ranks} />
          <ScrollArea>
            <ol className={p.ranks}>
              {RANKS.map((r, i) => {
                const unlocked = lvl.level >= r.minLevel;
                return (
                  <li key={r.id} className={p.rank} data-unlocked={unlocked ? "" : undefined} data-current={i === rankIndex ? "" : undefined}>
                    <span className={p.rankIcon}><RankInsignia rank={i} size={30} /></span>
                    <span className={p.rankName}>{r.name[locale]}</span>
                    <span className={p.rankState}>
                      {unlocked ? <><Check size={13} aria-hidden /> {t.profile.unlocked}</> : <><Lock size={13} aria-hidden /> {format(t.profile.lockedAt, { n: r.minLevel })}</>}
                    </span>
                  </li>
                );
              })}
            </ol>
          </ScrollArea>
        </Card>
        </MobilePanel>
      </div>
      </MobileTabs>
    </>
  );
}

function Count({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className={p.count}>
      <span className={p.countValue}>{value}</span>
      <span className={p.countLabel}>{label}</span>
    </div>
  );
}
