"use client";

import { useState, useTransition } from "react";
import { Check, Flag, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, CardHead, EmptyShowcase, Field, ProgressBar, ScrollArea, inputClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";
import { ResponsiveForm } from "@/components/ui/Sheet";
import { format } from "@/lib/i18n/dictionaries";
import { daysBetween } from "@/lib/day";
import { addGoalStep, createGoal, deleteGoal, deleteGoalStep, toggleGoalStep } from "@/lib/perso/actions";
import type { Goal } from "@/lib/perso/types";
import s from "../perso.module.css";

export function GoalsBoard({ goals, today }: { goals: Goal[]; today: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [why, setWhy] = useState("");
  const [date, setDate] = useState("");
  const run = (fn: () => Promise<{ ok: boolean }>, ok?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast.error(t.perso.error);
      else ok?.();
    });

  return (
    <div className={s.grid2}>
      <Card fill>
        <CardHead title={t.nav.goals} />
        <ScrollArea>
          {goals.length === 0 ? (
            <EmptyShowcase icon={Flag} title={t.perso.goals.emptyTitle} text={t.perso.goals.emptyText} steps={t.perso.goals.steps} />
          ) : (
            <ul className={s.goals}>
              {goals.map((g) => (
                <GoalItem key={g.id} goal={g} today={today} run={run} />
              ))}
            </ul>
          )}
        </ScrollArea>
      </Card>

      <ResponsiveForm
        title={t.perso.goals.new}
        fabLabel={t.perso.goals.new}
        fill
        after={
          <div className={s.ideasBlock}>
            <p className={s.subtle}>{t.perso.goals.ideas}</p>
            <div className={s.ideas} style={{ justifyContent: "flex-start" }}>
              {t.perso.goals.ideaList.map((idea) => (
                <button key={idea} type="button" className={s.idea} onClick={() => setTitle(idea)}>
                  <Plus size={12} aria-hidden /> {idea}
                </button>
              ))}
            </div>
          </div>
        }
      >
        {(close) => (
        <form
          className={s.form}
          onSubmit={(e) => {
            e.preventDefault();
            run(() => createGoal(title, why, date || null), () => {
              setTitle("");
              setWhy("");
              setDate("");
              close();
            });
          }}
        >
          <Field label={t.perso.goals.title}>
            <input className={inputClass} value={title} maxLength={120} placeholder={t.perso.goals.titlePh} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label={t.perso.goals.why}>
            <input className={inputClass} value={why} maxLength={300} placeholder={t.perso.goals.whyPh} onChange={(e) => setWhy(e.target.value)} />
          </Field>
          <Field label={t.perso.goals.target}>
            <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Button type="submit" disabled={pending || !title.trim()} style={{ justifySelf: "start" }}>
            <Plus size={15} aria-hidden /> {t.perso.goals.add}
          </Button>
        </form>
        )}
      </ResponsiveForm>
    </div>
  );
}

function GoalItem({ goal, today, run }: { goal: Goal; today: string; run: (fn: () => Promise<{ ok: boolean }>, ok?: () => void) => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState("");
  const done = goal.steps.filter((x) => x.done_at).length;
  const left = goal.target_date ? daysBetween(today, goal.target_date) : null;
  return (
    <li className={s.goal} data-done={goal.done_at ? "" : undefined}>
      <div className={s.goalHead}>
        <div>
          <p className={s.goalTitle}>{goal.title}</p>
          {goal.why && <p className={s.goalWhy}>{goal.why}</p>}
        </div>
        <button className={s.iconBtn} aria-label={t.perso.goals.delete} onClick={() => confirm(t.perso.goals.deleteConfirm) && run(() => deleteGoal(goal.id))}>
          <Trash2 size={14} />
        </button>
      </div>
      <div className={s.goalMeta}>
        {goal.done_at ? <Badge tone="solid">{t.perso.goals.done}</Badge> : null}
        <span>{done}/{goal.steps.length}</span>
        {left !== null && !goal.done_at && <span>{left >= 0 ? format(t.perso.goals.left, { n: left }) : t.perso.goals.late}</span>}
      </div>
      <ProgressBar value={goal.steps.length ? done / goal.steps.length : 0} />
      {goal.steps.length > 0 && (
        <ul className={s.steps}>
          {goal.steps.map((x) => (
            <li key={x.id} className={s.step} data-done={x.done_at ? "" : undefined}>
              <button className={s.check} role="checkbox" aria-checked={!!x.done_at} aria-label={x.title} onClick={() => run(() => toggleGoalStep(goal.id, x.id, !x.done_at))}>
                {x.done_at && <Check size={13} strokeWidth={3} />}
              </button>
              <span>{x.title}</span>
              <button className={s.iconBtn} aria-label={t.perso.goals.delete} onClick={() => run(() => deleteGoalStep(x.id))}>
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className={s.stepForm}
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addGoalStep(goal.id, step), () => setStep(""));
        }}
      >
        <input className={inputClass} value={step} maxLength={160} placeholder={t.perso.goals.stepPlaceholder} onChange={(e) => setStep(e.target.value)} aria-label={t.perso.goals.addStep} />
        <Button type="submit" size="sm" variant="secondary" disabled={!step.trim()}>
          <Plus size={14} aria-hidden />
        </Button>
      </form>
    </li>
  );
}
