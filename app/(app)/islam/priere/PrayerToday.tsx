"use client";

import { useOptimistic } from "react";
import { Chip, Segmented } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";
import { useAction } from "@/lib/client/useAction";
import { setPrayerStatus, toggleNafl } from "@/lib/islam/actions";
import { PRAYER_NAMES, type PrayerKey } from "@/lib/islam/prayer-times";
import { NAFL_KINDS, PRAYER_STATUSES, type NaflKind, type PrayerStatus } from "@/lib/islam/types";
import s from "../islam.module.css";

type Row = { key: PrayerKey; time: string; upcoming: boolean; current: boolean };

export function PrayerToday({ day, rows, initial }: { day: string; rows: Row[]; initial: Partial<Record<PrayerKey, PrayerStatus>> }) {
  const { t } = useI18n();
  const { run } = useAction();
  const [statuses, setOptimistic] = useOptimistic(initial, (state, [k, v]: [PrayerKey, PrayerStatus | null]) => {
    const n = { ...state };
    if (v) n[k] = v;
    else delete n[k];
    return n;
  });

  const choose = (k: PrayerKey, v: PrayerStatus) => {
    const next = statuses[k] === v ? null : v; // re-toucher le même statut l'efface
    run(() => setPrayerStatus(day, k, next), { optimistic: () => setOptimistic([k, next]) });
  };

  return (
    <div className={s.list}>
      {rows.map((r) => (
        <div key={r.key} className={`${s.row} ${r.current ? s.rowCurrent : ""}`}>
          <div className={`${s.rowName} ${r.upcoming && !statuses[r.key] ? s.rowDim : ""}`}>
            <span className={s.rowLabel}>{PRAYER_NAMES[r.key].label}</span>
            <span className={s.rowArabic} lang="ar">
              {PRAYER_NAMES[r.key].arabic}
            </span>
            <span className={s.rowTime}>{r.time}</span>
          </div>
          {r.upcoming && !statuses[r.key] ? (
            <span className={s.upcoming}>{t.islam.prayer.upcoming}</span>
          ) : (
            <Segmented
              label={PRAYER_NAMES[r.key].label}
              value={statuses[r.key] ?? null}
              options={PRAYER_STATUSES.map((v) => ({ value: v, label: t.islam.prayer.status[v] }))}
              onChange={(v) => choose(r.key, v)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function NaflChips({ day, initial }: { day: string; initial: NaflKind[] }) {
  const { t } = useI18n();
  const { run } = useAction();
  const [done, setOptimistic] = useOptimistic(initial, (state, [k, on]: [NaflKind, boolean]) =>
    on ? [...state, k] : state.filter((x) => x !== k),
  );

  return (
    <div className={s.chips}>
      {NAFL_KINDS.map((k) => {
        const on = done.includes(k);
        return (
          <Chip
            key={k}
            on={on}
            onClick={() => {
              run(() => toggleNafl(day, k, !on), { optimistic: () => setOptimistic([k, !on]) });
            }}
          >
            {t.islam.prayer.naflKinds[k]}
          </Chip>
        );
      })}
    </div>
  );
}
