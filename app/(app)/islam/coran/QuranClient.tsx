"use client";

import { useMemo, useOptimistic, useState } from "react";
import { ExternalLink, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Field, ScrollArea, Segmented, buttonClass, inputClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";
import { useAction } from "@/lib/client/useAction";
import { format, type Locale } from "@/lib/i18n/dictionaries";
import { addQuranPages, restartKhatm, reviewHifz, setHifz, setQuranPosition, undoQuranEntry } from "@/lib/islam/actions";
import { SURAHS } from "@/lib/islam/surahs";
import type { HifzRow } from "@/lib/islam/types";
import q from "./coran.module.css";

/* ---------- Ajout de pages ---------- */
export function QuranAdd({ lastEntryId }: { lastEntryId: number | null }) {
  const { t } = useI18n();
  const { run, pending } = useAction();
  const [custom, setCustom] = useState("");
  const add = (n: number) => run(() => addQuranPages(n), { onDone: () => toast.success(`+${n} ${t.islam.quran.pages}`) });

  return (
    <>
      <div className={q.addRow}>
        {[1, 2, 5, 10, 20].map((n) => (
          <button key={n} className={q.addBtn} onClick={() => add(n)} disabled={pending}>
            +{n}
          </button>
        ))}
      </div>
      <form
        className={q.customForm}
        onSubmit={(e) => {
          e.preventDefault();
          const n = Number(custom);
          if (n >= 1 && n <= 604) {
            add(n);
            setCustom("");
          }
        }}
      >
        <input
          className={q.customInput}
          inputMode="numeric"
          type="number"
          min={1}
          max={604}
          placeholder={t.islam.quran.other}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          aria-label={t.islam.quran.other}
        />
        <button className={q.addBtn} type="submit" disabled={pending || !custom}>
          {t.islam.quran.add}
        </button>
      </form>
      {lastEntryId !== null && (
        <button className={q.undo} onClick={() => run(() => undoQuranEntry(lastEntryId))} disabled={pending}>
          {t.islam.quran.undo}
        </button>
      )}
    </>
  );
}

export function RestartKhatm() {
  const { t } = useI18n();
  const { run, pending } = useAction();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (confirm(t.islam.quran.restartConfirm)) run(() => restartKhatm());
      }}
    >
      <RotateCcw size={14} aria-hidden /> {t.islam.quran.restart}
    </Button>
  );
}

/* ---------- Dernière position ---------- */
export function PositionForm({ page, surah, ruhUrl }: { page: number; surah: number; ruhUrl: string }) {
  const { t } = useI18n();
  const { run, pending } = useAction();
  const [p, setP] = useState(String(page));
  const [su, setSu] = useState(surah);
  const dirty = Number(p) !== page || su !== surah;

  return (
    <form
      className={q.posForm}
      onSubmit={(e) => {
        e.preventDefault();
        run(() => setQuranPosition(Number(p), su), { onDone: () => toast.success(t.islam.saved) });
      }}
    >
      <Field label={t.islam.quran.page}>
        <input className={inputClass} type="number" inputMode="numeric" min={1} max={604} value={p} onChange={(e) => setP(e.target.value)} />
      </Field>
      <Field label={t.islam.quran.surah}>
        <select className={inputClass} value={su} onChange={(e) => setSu(Number(e.target.value))}>
          {SURAHS.map((x) => (
            <option key={x.n} value={x.n}>
              {x.n}. {x.name}
            </option>
          ))}
        </select>
      </Field>
      <div className={q.posActions}>
        <Button type="submit" size="sm" disabled={pending || !dirty}>
          {t.islam.quran.save}
        </Button>
        <a className={buttonClass("secondary", "sm")} href={`${ruhUrl}/coran/${su}`} target="_blank" rel="noopener noreferrer">
          {t.islam.quran.openRuh} <ExternalLink size={13} aria-hidden />
        </a>
      </div>
    </form>
  );
}

/* ---------- Mémorisation (hifz) ---------- */
type Filter = "due" | "learning" | "memorized" | "all";

export function HifzList({ rows, today, locale }: { rows: HifzRow[]; today: string; locale: Locale }) {
  const { t } = useI18n();
  const { run } = useAction();
  const [query, setQuery] = useState("");
  const [optimistic, apply] = useOptimistic(rows, (state, patch: { surah: number; row: HifzRow | null }) => {
    const rest = state.filter((r) => r.surah !== patch.surah);
    return patch.row ? [...rest, patch.row].sort((a, b) => a.surah - b.surah) : rest;
  });
  const bySurah = useMemo(() => new Map(optimistic.map((r) => [r.surah, r])), [optimistic]);
  const due = optimistic.filter((r) => r.status === "memorized" && r.next_review && r.next_review <= today);
  const [filter, setFilter] = useState<Filter>(due.length ? "due" : optimistic.length ? "learning" : "all");

  const fmtDate = (d: string) =>
    new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));

  const list = SURAHS.filter((x) => {
    const r = bySurah.get(x.n);
    if (filter === "due" && !due.some((d) => d.surah === x.n)) return false;
    if (filter === "learning" && r?.status !== "learning") return false;
    if (filter === "memorized" && r?.status !== "memorized") return false;
    if (query) {
      const qq = query.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      const name = x.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      return name.includes(qq) || String(x.n) === qq || x.arabic.includes(query);
    }
    return true;
  });

  const base = (surah: number): HifzRow => ({
    surah, status: "learning", started_on: today, memorized_on: null, interval_days: 1, next_review: null, last_review: null, reviews: 0,
  });

  const empty = { due: t.islam.quran.emptyDue, learning: t.islam.quran.emptyLearning, memorized: t.islam.quran.emptyMemorized, all: "" }[filter];

  return (
    <>
      <div className={q.hifzTools}>
        <Segmented<Filter>
          full
          value={filter}
          onChange={setFilter}
          options={[
            { value: "due", label: `${t.islam.quran.due}${due.length ? ` · ${due.length}` : ""}` },
            { value: "learning", label: t.islam.quran.learning },
            { value: "memorized", label: t.islam.quran.memorized },
            { value: "all", label: t.islam.quran.all },
          ]}
        />
        <input className={inputClass} type="search" placeholder={t.islam.quran.search} value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {list.length === 0 ? (
        <p className={q.empty}>{empty}</p>
      ) : (
        <ScrollArea className={q.hifzScroll}>
        <div className={q.hifzList}>
          {list.map((x) => {
            const r = bySurah.get(x.n);
            const isDue = r?.status === "memorized" && !!r.next_review && r.next_review <= today;
            return (
              <div key={x.n} className={q.hifzRow}>
                <span className={q.hifzNum}>{x.n}</span>
                <div className={q.hifzName}>
                  <span className={q.hifzTitle}>
                    {x.name}
                    <span className={q.hifzArabic} lang="ar">
                      {x.arabic}
                    </span>
                  </span>
                  <span className={q.hifzMeta}>
                    {x.ayahs} {t.islam.quran.ayahs}
                    {r?.status === "memorized" && r.next_review &&
                      ` · ${isDue ? t.islam.quran.reviewToday : format(t.islam.quran.reviewOn, { date: fmtDate(r.next_review) })}`}
                  </span>
                </div>
                <div className={q.hifzActions}>
                  {!r && (
                    <Button size="sm" variant="secondary" onClick={() => run(() => setHifz(x.n, "learning"), { optimistic: () => apply({ surah: x.n, row: base(x.n) }) })}>
                      {t.islam.quran.start}
                    </Button>
                  )}
                  {r?.status === "learning" && (
                    <>
                      <Button size="sm" onClick={() => run(() => setHifz(x.n, "memorized"), { optimistic: () => apply({ surah: x.n, row: { ...r, status: "memorized", memorized_on: today, next_review: null } }) })}>
                        {t.islam.quran.markMemorized}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => run(() => setHifz(x.n, null), { optimistic: () => apply({ surah: x.n, row: null }) })}>
                        {t.islam.quran.remove}
                      </Button>
                    </>
                  )}
                  {r?.status === "memorized" && (isDue || filter === "due") && (
                    <>
                      <Button size="sm" onClick={() => run(() => reviewHifz(x.n, "good"), { optimistic: () => apply({ surah: x.n, row: { ...r, next_review: "9999-12-31" } }) })}>
                        {t.islam.quran.good}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => run(() => reviewHifz(x.n, "hard"), { optimistic: () => apply({ surah: x.n, row: { ...r, next_review: "9999-12-31" } }) })}>
                        {t.islam.quran.hard}
                      </Button>
                    </>
                  )}
                  {r?.status === "memorized" && !isDue && filter !== "due" && <Badge tone="solid">{t.islam.quran.markMemorized}</Badge>}
                  {r?.status === "memorized" && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => run(() => setHifz(x.n, "learning"), { optimistic: () => apply({ surah: x.n, row: { ...r, status: "learning", memorized_on: null, next_review: null } }) })}>
                        {t.islam.quran.backToLearning}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => run(() => setHifz(x.n, null), { optimistic: () => apply({ surah: x.n, row: null }) })}>
                        {t.islam.quran.remove}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </ScrollArea>
      )}
    </>
  );
}
