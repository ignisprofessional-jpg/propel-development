"use client";

import { useOptimistic, useState } from "react";
import { Check } from "lucide-react";
import { Card, ProgressBar, ScrollArea, Segmented } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";
import { useAction } from "@/lib/client/useAction";
import { format, type Locale } from "@/lib/i18n/dictionaries";
import { setAdhkarItems } from "@/lib/islam/actions";
import { adhkarFor, type Period } from "@/lib/islam/adhkar";
import a from "./adhkar.module.css";

export function AdhkarList({ day, initialPeriod, done, locale }: { day: string; initialPeriod: Period; done: Record<Period, string[]>; locale: Locale }) {
  const { t } = useI18n();
  const { run } = useAction();
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [state, apply] = useOptimistic(done, (s, p: { period: Period; items: string[] }) => ({ ...s, [p.period]: p.items }));

  const items = adhkarFor(period);
  const checked = state[period];
  const count = items.filter((d) => checked.includes(d.id)).length;

  const toggle = (id: string) => {
    const next = checked.includes(id) ? checked.filter((x) => x !== id) : [...checked, id];
    run(() => setAdhkarItems(day, period, next), { optimistic: () => apply({ period, items: next }) });
  };

  return (
    <Card fill>
      <div className={a.head}>
        <Segmented<Period>
          value={period}
          onChange={setPeriod}
          options={[
            { value: "morning", label: t.islam.adhkar.morning },
            { value: "evening", label: t.islam.adhkar.evening },
          ]}
        />
        <span className={a.count}>{format(t.islam.adhkar.progress, { done: count, total: items.length })}</span>
      </div>
      <ProgressBar value={count / items.length} />
      {count === items.length && <p className={a.complete}>{t.islam.adhkar.complete}</p>}

      <ScrollArea className={a.scroll}>
      <ul className={a.list}>
        {items.map((d) => {
          const on = checked.includes(d.id);
          return (
            <li key={d.id}>
              <button className={a.item} aria-pressed={on} onClick={() => toggle(d.id)}>
                <span className={a.check} aria-hidden>
                  {on && <Check size={14} strokeWidth={3} />}
                </span>
                <span className={a.body}>
                  <span className={a.translit}>{(period === "evening" && d.translit.evening) || d.translit.morning}</span>
                  {/* Une fois coché, le texte se replie : la liste raccourcit au fil de la lecture */}
                  <span className={a.more}>
                    <span className={a.moreIn}>
                      {d.arabic && (
                        <span className={a.arabic} lang="ar" dir="rtl">
                          {d.arabic}
                        </span>
                      )}
                      <span className={a.meaning}>{d.meaning[locale]}</span>
                      <span className={a.source}>{d.source}</span>
                    </span>
                  </span>
                </span>
                {d.count > 1 && <span className={a.times}>×{d.count}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      </ScrollArea>
    </Card>
  );
}
