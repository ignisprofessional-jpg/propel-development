"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Segmented } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";
import st from "./stats.module.css";

type Metric = "prayers" | "quran" | "xp";
type Range = "week" | "month" | "year";

/** Barres (semaine, mois, année) + carte de chaleur sur 12 mois. */
export function StatsCharts({ days, series }: { days: string[]; series: Record<Metric, Record<string, number>> }) {
  const { t, locale } = useI18n();
  const [metric, setMetric] = useState<Metric>("prayers");
  const [range, setRange] = useState<Range>("week");
  const data = series[metric];
  const loc = locale === "fr" ? "fr-FR" : "en-GB";

  const bars = useMemo(() => {
    if (range === "week" || range === "month") {
      const n = range === "week" ? 7 : 30;
      return days.slice(-n).map((d) => ({
        key: d,
        label: new Intl.DateTimeFormat(loc, range === "week" ? { weekday: "short", timeZone: "UTC" } : { day: "numeric", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z")),
        value: data[d] ?? 0,
      }));
    }
    // Année : un total par mois
    const months = new Map<string, number>();
    for (const d of days) months.set(d.slice(0, 7), (months.get(d.slice(0, 7)) ?? 0) + (data[d] ?? 0));
    return [...months.entries()].slice(-12).map(([m, v]) => ({
      key: m,
      label: new Intl.DateTimeFormat(loc, { month: "short", timeZone: "UTC" }).format(new Date(m + "-15T12:00:00Z")),
      value: v,
    }));
  }, [range, days, data, loc]);

  const max = Math.max(1, ...bars.map((b) => b.value));
  const total = bars.reduce((a, b) => a + b.value, 0);
  const avgDays = range === "week" ? 7 : range === "month" ? 30 : 365;

  // Carte de chaleur : colonnes = semaines (lundi en haut)
  // La carte de chaleur démarre sur les semaines les plus récentes (à droite)
  const heatRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = heatRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);
  const heat = useMemo(() => {
    const vals = days.map((d) => data[d] ?? 0);
    const top = Math.max(1, ...vals);
    const first = new Date(days[0] + "T12:00:00Z").getUTCDay(); // 0 = dimanche
    const pad = (first + 6) % 7;
    const cells = [...Array(pad).fill(null), ...days.map((d, i) => ({ d, level: vals[i] === 0 ? 0 : Math.ceil((vals[i] / top) * 4) }))];
    return cells;
  }, [days, data]);

  return (
    <div className={st.charts}>
      <div className={st.controls}>
        <Segmented<Metric>
          value={metric}
          onChange={setMetric}
          options={(["prayers", "quran", "xp"] as Metric[]).map((m) => ({ value: m, label: t.stats.metrics[m] }))}
        />
        <Segmented<Range>
          value={range}
          onChange={setRange}
          options={(["week", "month", "year"] as Range[]).map((r) => ({ value: r, label: t.stats.range[r] }))}
        />
      </div>

      <div className={st.summary}>
        <span><strong>{total}</strong> {t.stats.total.toLowerCase()}</span>
        <span><strong>{(total / avgDays).toFixed(1).replace(".", locale === "fr" ? "," : ".")}</strong> {t.stats.average.toLowerCase()}</span>
      </div>

      <div className={st.bars} data-range={range} role="img" aria-label={`${t.stats.metrics[metric]} · ${t.stats.range[range]}`}>
        {bars.map((b) => (
          <div key={b.key} className={st.barCol} title={`${b.label} · ${b.value}`}>
            <span className={st.barTrack}>
              <i style={{ height: `${(b.value / max) * 100}%` }} />
            </span>
            <span className={st.barLabel}>{b.label.replace(".", "")}</span>
          </div>
        ))}
      </div>

      <div className={st.heatHead}>
        <span>{t.stats.heatmap}</span>
        <span className={st.legend}>
          {t.stats.less}
          {[0, 1, 2, 3, 4].map((l) => (
            <i key={l} data-l={l} />
          ))}
          {t.stats.more}
        </span>
      </div>
      <div className={st.heat} ref={heatRef}>
        {heat.map((c, i) =>
          c ? <i key={c.d} data-l={c.level} title={`${c.d} · ${data[c.d] ?? 0}`} /> : <i key={`pad-${i}`} data-pad="" />,
        )}
      </div>
    </div>
  );
}
