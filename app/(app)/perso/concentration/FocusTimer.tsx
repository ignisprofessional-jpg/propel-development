"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Pause, Play, Square, X } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, Field, Segmented, inputClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";
import { format } from "@/lib/i18n/dictionaries";
import { deleteFocus, saveFocus } from "@/lib/perso/actions";
import s from "../perso.module.css";

const KEY = "focus-timer";
const WORK = 25 * 60_000;
const BREAK = 5 * 60_000;

type State = {
  mode: "pomodoro" | "free";
  phase: "work" | "break";
  running: boolean;
  startedAt: string | null; // début de la session de travail (pour l'enregistrement)
  segmentStart: number | null; // horodatage du segment en cours
  elapsed: number; // ms accumulées avant le segment en cours
  taskId: string;
  label: string;
};
const INITIAL: State = { mode: "pomodoro", phase: "work", running: false, startedAt: null, segmentStart: null, elapsed: 0, taskId: "", label: "" };

const load = (): State => {
  try {
    return { ...INITIAL, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return INITIAL;
  }
};
const two = (n: number) => String(n).padStart(2, "0");
const clock = (ms: number) => {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h ? `${h}:${two(m)}:${two(total % 60)}` : `${two(m)}:${two(total % 60)}`;
};

/**
 * Minuteur : l'état est gardé dans le navigateur, donc il continue même si on
 * change de page. Une session de travail terminée est enregistrée (XP, stats, paliers).
 */
export function FocusTimer({ tasks }: { tasks: { id: string; title: string }[] }) {
  const { t } = useI18n();
  const [st, setSt] = useState<State>(INITIAL);
  const [now, setNow] = useState(() => Date.now());
  const [, start] = useTransition();
  const saving = useRef(false);

  useEffect(() => setSt(load()), []);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(st));
    } catch {}
  }, [st]);
  useEffect(() => {
    if (!st.running) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [st.running]);

  const elapsed = st.elapsed + (st.running && st.segmentStart ? now - st.segmentStart : 0);
  const target = st.mode === "pomodoro" ? (st.phase === "work" ? WORK : BREAK) : null;
  const display = target ? target - elapsed : elapsed;

  const save = useCallback(
    (ms: number, s0: State) => {
      const minutes = Math.floor(ms / 60_000);
      if (minutes < 1 || !s0.startedAt) {
        toast(t.perso.focus.tooShort);
        return;
      }
      if (saving.current) return;
      saving.current = true;
      start(async () => {
        const r = await saveFocus({ startedAt: s0.startedAt!, minutes, mode: s0.mode, taskId: s0.taskId || null, label: s0.label || tasks.find((x) => x.id === s0.taskId)?.title || "" });
        saving.current = false;
        if (r.ok) toast.success(format(t.perso.focus.saved, { n: minutes }));
        else toast.error(t.perso.error);
      });
    },
    [t, tasks],
  );

  // Fin d'un pomodoro : on enregistre le travail, puis pause ; fin de pause : retour au travail
  useEffect(() => {
    if (!st.running || !target || elapsed < target) return;
    try {
      navigator.vibrate?.([60, 80, 60]);
    } catch {}
    if (st.phase === "work") {
      save(WORK, st);
      setSt((o) => ({ ...o, phase: "break", elapsed: 0, segmentStart: Date.now(), startedAt: null }));
    } else {
      setSt((o) => ({ ...o, phase: "work", running: false, elapsed: 0, segmentStart: null, startedAt: null }));
    }
  }, [elapsed, target, st, save]);

  const play = () =>
    setSt((o) => ({ ...o, running: true, segmentStart: Date.now(), startedAt: o.startedAt ?? (o.phase === "work" ? new Date().toISOString() : null) }));
  const pause = () => setSt((o) => ({ ...o, running: false, elapsed: elapsed, segmentStart: null }));
  const stop = () => {
    if (st.phase === "work") save(elapsed, st);
    setSt((o) => ({ ...INITIAL, mode: o.mode, taskId: o.taskId, label: o.label }));
  };
  const reset = () => setSt((o) => ({ ...INITIAL, mode: o.mode, taskId: o.taskId, label: o.label }));
  const idle = !st.running && elapsed === 0;
  const ratio = target ? Math.min(1, elapsed / target) : (elapsed % 3_600_000) / 3_600_000;
  const R = 47;
  const C = 2 * Math.PI * R;

  return (
    <Card variant="hero" className={s.timerCard}>
      <Segmented<"pomodoro" | "free">
        value={st.mode}
        onChange={(m) => idle && setSt((o) => ({ ...o, mode: m, phase: "work" }))}
        options={[
          { value: "pomodoro", label: t.perso.focus.pomodoro },
          { value: "free", label: t.perso.focus.free },
        ]}
      />
      <div className={s.timerRing}>
        <svg viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r={R} className={s.timerTrack} />
          <circle cx="50" cy="50" r={R} className={s.timerArc} strokeDasharray={C} strokeDashoffset={C * (1 - ratio)} />
        </svg>
        <div className={s.timerCenter}>
          <span className={s.timerValue} aria-live="off">{clock(display)}</span>
          <span className={s.timerPhase}>{st.phase === "work" ? t.perso.focus.work : t.perso.focus.breakTime}</span>
        </div>
      </div>
      <div className={s.timerControls}>
        {st.running ? (
          <Button onClick={pause}>
            <Pause size={16} aria-hidden /> {t.perso.focus.pause}
          </Button>
        ) : (
          <Button onClick={play}>
            <Play size={16} aria-hidden /> {idle ? t.perso.focus.start : t.perso.focus.resume}
          </Button>
        )}
        {!idle && st.phase === "work" && (
          <Button variant="secondary" onClick={stop}>
            <Square size={14} aria-hidden /> {t.perso.focus.stop}
          </Button>
        )}
        {!idle && (
          <Button variant="ghost" onClick={reset}>
            {t.perso.focus.reset}
          </Button>
        )}
      </div>
      <div className={s.timerForm}>
        <Field label={t.perso.focus.linkTask}>
          <select className={inputClass} value={st.taskId} onChange={(e) => setSt((o) => ({ ...o, taskId: e.target.value }))}>
            <option value="">{t.perso.focus.noTask}</option>
            {tasks.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
          </select>
        </Field>
        <Field label={t.perso.focus.label}>
          <input className={inputClass} value={st.label} maxLength={120} onChange={(e) => setSt((o) => ({ ...o, label: e.target.value }))} />
        </Field>
      </div>
    </Card>
  );
}

export function SessionDelete({ id }: { id: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  return (
    <button className={s.iconBtn} disabled={pending} aria-label={t.perso.tasks.delete} onClick={() => start(async () => void (await deleteFocus(id)))}>
      <X size={14} />
    </button>
  );
}
