"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button, Card, CardHead, Field, ScrollArea, inputClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";
import { useAction } from "@/lib/client/useAction";
import { addDhikrCounter, deleteDhikrCounter, saveDhikrCount } from "@/lib/islam/actions";
import type { DhikrCounter } from "@/lib/islam/types";
import a from "./adhkar.module.css";

const vibrate = (ms: number | number[]) => {
  try {
    navigator.vibrate?.(ms);
  } catch {}
};

/**
 * Compteur de dhikr : le comptage est instantané (état local) et envoyé
 * au serveur par lots, 700 ms après la dernière touche.
 */
export function Tasbih({ day, counters }: { day: string; counters: DhikrCounter[] }) {
  const { t } = useI18n();
  const { run, pending } = useAction();
  const [counts, setCounts] = useState<Record<string, number>>(() => Object.fromEntries(counters.map((c) => [c.id, c.today])));
  const [activeId, setActiveId] = useState(counters[0]?.id ?? null);
  const [adding, setAdding] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const latest = useRef(counts);
  latest.current = counts;

  // Nouveaux compteurs arrivés du serveur
  useEffect(() => {
    setCounts((c) => {
      const n = { ...c };
      for (const x of counters) if (!(x.id in n)) n[x.id] = x.today;
      return n;
    });
    if (!counters.some((c) => c.id === activeId)) setActiveId(counters[0]?.id ?? null);
  }, [counters, activeId]);

  const persist = useCallback(
    (id: string) => {
      clearTimeout(timers.current[id]);
      timers.current[id] = setTimeout(() => {
        saveDhikrCount(day, id, latest.current[id] ?? 0);
      }, 700);
    },
    [day],
  );

  // Envoie ce qui reste en attente si on quitte la page
  useEffect(() => {
    const ts = timers.current;
    return () => {
      for (const id of Object.keys(ts)) {
        clearTimeout(ts[id]);
        saveDhikrCount(day, id, latest.current[id] ?? 0);
      }
    };
  }, [day]);

  const active = counters.find((c) => c.id === activeId) ?? null;
  const value = active ? counts[active.id] ?? 0 : 0;

  const change = (delta: number) => {
    if (!active) return;
    const next = Math.max(0, value + delta);
    setCounts((c) => ({ ...c, [active.id]: next }));
    if (delta > 0) vibrate(next > 0 && next % active.target === 0 ? [30, 60, 30] : 8);
    persist(active.id);
  };

  const ratio = active ? Math.min(1, value / active.target) : 0;
  const R = 46;
  const C = 2 * Math.PI * R;

  return (
    <Card fill>
      <CardHead title={t.islam.adhkar.tasbih} />

      {active && (
        <div className={a.tasbih}>
          <button className={a.counter} onClick={() => change(1)} aria-label={`${active.label} +1`}>
            <svg viewBox="0 0 100 100" aria-hidden>
              <circle cx="50" cy="50" r={R} className={a.track} />
              <circle cx="50" cy="50" r={R} className={a.arc} strokeDasharray={C} strokeDashoffset={C * (1 - ratio)} />
            </svg>
            <span className={a.counterInner}>
              {active.arabic && (
                <span className={a.counterArabic} lang="ar">
                  {active.arabic}
                </span>
              )}
              <span className={a.counterValue} aria-live="polite">
                {value}
              </span>
              <span className={a.counterTarget}>
                {value >= active.target ? t.islam.adhkar.reached : `/ ${active.target}`}
              </span>
            </span>
          </button>
          <p className={a.hint}>{t.islam.adhkar.tap}</p>
          <div className={a.counterActions}>
            <Button variant="secondary" size="sm" icon onClick={() => change(-1)} aria-label="−1">
              <Minus size={16} />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => change(-value)} disabled={value === 0}>
              <RotateCcw size={14} aria-hidden /> {t.islam.adhkar.reset}
            </Button>
          </div>
        </div>
      )}

      <ScrollArea>
      <ul className={a.counters}>
        {counters.map((c) => {
          const v = counts[c.id] ?? 0;
          return (
            <li key={c.id} className={a.counterRow} data-active={c.id === activeId ? "" : undefined}>
              <button className={a.counterPick} onClick={() => setActiveId(c.id)}>
                <span className={a.counterLabel}>{c.label}</span>
                <span className={a.counterMini}>
                  {v} / {c.target}
                </span>
              </button>
              <button
                className={a.del}
                aria-label={`${t.islam.adhkar.delete} ${c.label}`}
                onClick={() => {
                  if (confirm(t.islam.adhkar.deleteConfirm)) run(() => deleteDhikrCounter(c.id));
                }}
              >
                <Trash2 size={14} />
              </button>
            </li>
          );
        })}
      </ul>

      {adding ? (
        <form
          className={a.addForm}
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            run(() => addDhikrCounter(String(f.get("label") ?? ""), String(f.get("arabic") ?? ""), Number(f.get("target") ?? 33)), {
              onDone: () => setAdding(false),
            });
          }}
        >
          <Field label={t.islam.adhkar.label}>
            <input className={inputClass} name="label" required maxLength={80} autoFocus />
          </Field>
          <Field label={t.islam.adhkar.arabic}>
            <input className={inputClass} name="arabic" dir="rtl" lang="ar" maxLength={200} />
          </Field>
          <Field label={t.islam.adhkar.targetLabel}>
            <input className={inputClass} name="target" type="number" inputMode="numeric" min={1} max={100000} defaultValue={33} />
          </Field>
          <div className={a.addActions}>
            <Button type="submit" size="sm" disabled={pending}>
              {t.islam.quran.save}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
              {t.nav.close}
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
          <Plus size={14} aria-hidden /> {t.islam.adhkar.add}
        </Button>
      )}
      </ScrollArea>
    </Card>
  );
}
