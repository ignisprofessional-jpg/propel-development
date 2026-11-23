"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { Check, Plus, Repeat2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, CardHead, EmptyShowcase, Field, ScrollArea, inputClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";
import { MobilePanel, MobileTabs } from "@/components/ui/Sheet";
import { format } from "@/lib/i18n/dictionaries";
import { addDays, lastDays } from "@/lib/day";
import { archiveHabit, createHabit, toggleHabit } from "@/lib/perso/actions";
import type { Habit } from "@/lib/perso/types";
import s from "../perso.module.css";

const weekStart = (d: string) => addDays(d, -((new Date(d + "T12:00:00Z").getUTCDay() + 6) % 7));

/** Série : jours d'affilée (quotidienne) ou semaines d'affilée remplies (hebdomadaire). */
function stats(h: Habit, today: string) {
  const set = new Set(h.logs);
  let streak = 0;
  let best = 0;
  if (h.frequency === "daily") {
    let d = set.has(today) ? today : addDays(today, -1);
    while (set.has(d)) {
      streak++;
      d = addDays(d, -1);
    }
    let run = 0;
    for (const day of lastDays(182, today)) {
      run = set.has(day) ? run + 1 : 0;
      best = Math.max(best, run);
    }
  } else {
    const count = (ws: string) => h.logs.filter((d) => d >= ws && d <= addDays(ws, 6)).length;
    let ws = weekStart(today);
    if (count(ws) < h.per_week) ws = addDays(ws, -7);
    while (count(ws) >= h.per_week) {
      streak++;
      ws = addDays(ws, -7);
    }
    best = streak;
  }
  const last30 = lastDays(30, today).filter((d) => set.has(d)).length;
  const rate = h.frequency === "daily" ? last30 / 30 : Math.min(1, last30 / ((30 / 7) * h.per_week));
  return { streak, best: Math.max(best, streak), rate, total: h.logs.length };
}

export function HabitsBoard({ habits, today }: { habits: Habit[]; today: string }) {
  const { t, locale } = useI18n();
  const [pending, start] = useTransition();
  const [selectedId, setSelectedId] = useState(habits[0]?.id ?? null);
  const [tab, setTab] = useState("list");
  const [title, setTitle] = useState("");
  const [freq, setFreq] = useState<"daily" | "weekly">("daily");
  const [perWeek, setPerWeek] = useState("3");
  const [list, apply] = useOptimistic(habits, (state, p: { id: string; day: string; on: boolean }) =>
    state.map((h) => (h.id === p.id ? { ...h, logs: p.on ? [...h.logs, p.day] : h.logs.filter((d) => d !== p.day) } : h)),
  );
  const days = lastDays(7, today);
  const selected = list.find((h) => h.id === selectedId) ?? list[0] ?? null;
  const weekday = (d: string) => new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { weekday: "narrow", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));

  const toggle = (h: Habit, day: string) => {
    const on = !h.logs.includes(day);
    start(async () => {
      apply({ id: h.id, day, on });
      const r = await toggleHabit(h.id, day, on);
      if (!r.ok) toast.error(t.perso.error);
    });
  };

  const heat = useMemo(() => {
    if (!selected) return [];
    const ds = lastDays(182, today);
    const pad = (new Date(ds[0] + "T12:00:00Z").getUTCDay() + 6) % 7;
    const set = new Set(selected.logs);
    return [...Array(pad).fill(null), ...ds.map((d) => ({ d, on: set.has(d) }))];
  }, [selected, today]);

  const st = selected ? stats(selected, today) : null;

  return (
    <MobileTabs value={tab} onChange={setTab} tabs={[{ id: "list", label: t.nav.habits }, { id: "detail", label: list.length ? t.perso.habits.detail : t.perso.habits.ideas }]}>
    <div className={s.grid2}>
      <MobilePanel id="list">
      <Card fill>
        <CardHead title={t.nav.habits} />
        <form
          className={s.formRow}
          data-quick=""
          data-open={title.trim() ? "" : undefined}
          style={{ marginBottom: "var(--s-4)", flex: "none" }}
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await createHabit(title, freq, Number(perWeek));
              if (r.ok) {
                setTitle("");
                if (r.id) setSelectedId(r.id);
              } else toast.error(t.perso.error);
            });
          }}
        >
          <Field label={t.perso.habits.new}>
            <input className={inputClass} value={title} maxLength={80} placeholder={t.perso.habits.placeholder} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label={" "}>
            <select className={inputClass} value={freq} onChange={(e) => setFreq(e.target.value as "daily" | "weekly")} aria-label={t.perso.habits.daily}>
              <option value="daily">{t.perso.habits.daily}</option>
              <option value="weekly">{t.perso.habits.weekly}</option>
            </select>
          </Field>
          {freq === "weekly" && (
            <Field label={t.perso.habits.perWeek}>
              <input className={inputClass} type="number" min={1} max={7} value={perWeek} onChange={(e) => setPerWeek(e.target.value)} />
            </Field>
          )}
          <Button type="submit" disabled={pending || !title.trim()}>
            <Plus size={15} aria-hidden /> {t.perso.habits.add}
          </Button>
        </form>
        <ScrollArea>
          {list.length === 0 ? (
            <EmptyShowcase icon={Repeat2} title={t.perso.habits.emptyTitle} text={t.perso.habits.emptyText} steps={t.perso.habits.steps} />
          ) : (
            <ul className={s.habitList}>
              {list.map((h) => {
                const hs = stats(h, today);
                const weekCount = h.logs.filter((d) => d >= weekStart(today) && d <= today).length;
                return (
                  <li key={h.id} className={s.habit} data-selected={h.id === selected?.id ? "" : undefined} onClick={() => {
                    // sur ordinateur le détail est à côté ; sur téléphone on bascule sur l'onglet Détail
                    if (h.id === selected?.id || matchMedia("(max-width: 960px)").matches) setTab("detail");
                    setSelectedId(h.id);
                  }}>
                    <span className={s.habitName}>
                      <span className={s.habitTitle}>{h.title}</span>
                      <span className={s.habitMeta}>
                        {h.frequency === "daily" ? `${hs.streak} ${t.perso.habits.streak}` : format(t.perso.habits.thisWeek, { n: weekCount, t: h.per_week })}
                      </span>
                    </span>
                    <span className={s.days7} onClick={(e) => e.stopPropagation()}>
                      {days.map((d) => (
                        <button key={d} className={s.dayBtn} aria-pressed={h.logs.includes(d)} data-today={d === today ? "" : undefined} onClick={() => toggle(h, d)} aria-label={`${h.title} ${d}`}>
                          {weekday(d)}
                          <span className={s.dayDot}>{h.logs.includes(d) && <Check size={13} strokeWidth={3} />}</span>
                        </button>
                      ))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </Card>
      </MobilePanel>

      <MobilePanel id="detail">
      <Card fill>
        {selected && st ? (
          <>
            <CardHead
              title={selected.title}
              action={
                <button
                  className={s.iconBtn}
                  aria-label={t.perso.habits.archive}
                  title={t.perso.habits.archive}
                  onClick={() => confirm(t.perso.habits.archiveConfirm) && start(async () => void (await archiveHabit(selected.id)))}
                >
                  <X size={15} />
                </button>
              }
            />
            <div className={s.statsRow}>
              <div className={s.stat}>
                <span className={s.statValue}>{st.streak}</span>
                <span className={s.statLabel}>{selected.frequency === "daily" ? t.perso.habits.streak : t.stats.days}</span>
              </div>
              <div className={s.stat}>
                <span className={s.statValue}>{st.best}</span>
                <span className={s.statLabel}>{t.perso.habits.best}</span>
              </div>
              <div className={s.stat}>
                <span className={s.statValue}>{Math.round(st.rate * 100)} %</span>
                <span className={s.statLabel}>{t.perso.habits.rate}</span>
              </div>
              <div className={s.stat}>
                <span className={s.statValue}>{st.total}</span>
                <span className={s.statLabel}>{t.perso.habits.total}</span>
              </div>
            </div>
            <p className={s.subtle} style={{ marginBottom: 8 }}>{t.perso.habits.heatmap}</p>
            <div className={s.heat}>
              {heat.map((c, i) => (c ? <i key={c.d} data-on={c.on ? "" : undefined} title={c.d} /> : <i key={`p${i}`} data-pad="" />))}
            </div>
          </>
        ) : (
          <EmptyShowcase
            icon={Sparkles}
            ghost="doc"
            title={list.length ? t.perso.habits.selectTitle : t.perso.habits.ideas}
            text={list.length ? t.perso.habits.select : undefined}
            action={
              <div className={s.ideas}>
                {t.perso.habits.ideaList.map((idea) => (
                  <button key={idea} type="button" className={s.idea} onClick={() => { setTitle(idea); setTab("list"); }}>
                    <Plus size={12} aria-hidden /> {idea}
                  </button>
                ))}
              </div>
            }
          />
        )}
      </Card>
      </MobilePanel>
    </div>
    </MobileTabs>
  );
}
