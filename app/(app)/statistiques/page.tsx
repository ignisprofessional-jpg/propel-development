import { Flame } from "lucide-react";
import { Card, PageHeader, StatCard } from "@/components/ui";
import { getDict } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/dictionaries";
import { getStatsData } from "@/lib/game/stats";
import { StatsCharts } from "./StatsCharts";
import st from "./stats.module.css";

export const metadata = { title: "Statistiques" };

export default async function StatsPage() {
  const [t, data] = await Promise.all([getDict(), getStatsData()]);
  const streaks = [
    { key: "prayers", label: t.stats.prayerStreak, v: data.streaks.prayers },
    { key: "quran", label: t.stats.quranStreak, v: data.streaks.quran },
    { key: "adhkar", label: t.stats.adhkarStreak, v: data.streaks.adhkar },
  ];
  return (
    <>
      <PageHeader kicker={t.nav.game} title={t.nav.stats} />
      <div className={st.page}>
        <div className={st.streaks}>
          {streaks.map((x) => (
            <StatCard key={x.key} compact icon={Flame} label={x.label} value={x.v.current} unit={t.stats.days} foot={format(t.stats.best, { n: x.v.best })} />
          ))}
        </div>
        <Card fill className={st.chartCard}>
          <StatsCharts days={data.days} series={data.series} />
        </Card>
      </div>
    </>
  );
}
