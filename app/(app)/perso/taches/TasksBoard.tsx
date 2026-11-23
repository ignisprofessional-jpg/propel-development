"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { CalendarCheck, Check, Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, Chip, EmptyShowcase, ScrollArea, Segmented, inputClass } from "@/components/ui";
import { format } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";
import { addDays } from "@/lib/day";
import { createTask, deleteTask, setTaskStatus } from "@/lib/perso/actions";
import type { Recurrence, Task, TaskSpace, TaskStatus } from "@/lib/perso/types";
import s from "../perso.module.css";

type View = "today" | "week" | "kanban" | "calendar";
type Filter = "all" | TaskSpace;

export function TasksBoard({ tasks, today, autoFocus, lockedSpace }: { tasks: Task[]; today: string; autoFocus?: boolean; lockedSpace?: TaskSpace }) {
  const { t, locale } = useI18n();
  const [pending, start] = useTransition();
  const [view, setView] = useState<View>("today");
  const [filter, setFilter] = useState<Filter>(lockedSpace ?? "all");
  const [title, setTitle] = useState("");
  const [space, setSpace] = useState<TaskSpace>(lockedSpace ?? "perso");
  const [due, setDue] = useState(today);
  const [prio, setPrio] = useState("1");
  const [recur, setRecur] = useState<"none" | Recurrence>("none");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);

  const [list, apply] = useOptimistic(tasks, (state, p: { id: string; status?: TaskStatus; remove?: boolean }) =>
    p.remove ? state.filter((x) => x.id !== p.id) : state.map((x) => (x.id === p.id ? { ...x, status: p.status!, done_at: p.status === "done" ? new Date().toISOString() : null } : x)),
  );
  const visible = useMemo(() => list.filter((x) => filter === "all" || x.space === filter), [list, filter]);
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(loc, { ...o, timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));

  const setStatus = (task: Task, status: TaskStatus) =>
    start(async () => {
      apply({ id: task.id, status });
      const r = await setTaskStatus(task.id, status);
      if (!r.ok) toast.error(t.perso.error);
    });
  const remove = (task: Task) => {
    if (!confirm(t.perso.tasks.deleteConfirm)) return;
    start(async () => {
      apply({ id: task.id, remove: true });
      await deleteTask(task.id);
    });
  };

  const Row = ({ task }: { task: Task }) => {
    const done = task.status === "done";
    const late = !done && task.due_date !== null && task.due_date < today;
    return (
      <li className={s.task} data-done={done ? "" : undefined}>
        <button className={s.check} role="checkbox" aria-checked={done} aria-label={task.title} onClick={() => setStatus(task, done ? "todo" : "done")}>
          {done && <Check size={13} strokeWidth={3} />}
        </button>
        <span className={s.taskBody}>
          <span className={s.taskTitle}>{task.title}</span>
          <span className={s.taskMeta}>
            <span>{t.perso.tasks.spaces[task.space]}</span>
            {task.due_date && <span data-late={late ? "" : undefined}>{late ? t.perso.tasks.overdue : fmt(task.due_date, { day: "numeric", month: "short" })}</span>}
            {task.recurrence && <Repeat size={11} aria-label={t.perso.tasks.recurrence[task.recurrence]} />}
            {task.status === "doing" && <Badge tone="soft">{t.perso.tasks.status.doing}</Badge>}
          </span>
        </span>
        <span className={s.prio} data-p={task.priority} title={t.perso.tasks.priority[task.priority]} />
        <button className={`${s.iconBtn} ${s.del}`} onClick={() => remove(task)} aria-label={t.perso.tasks.delete}>
          <Trash2 size={14} />
        </button>
      </li>
    );
  };

  /* ---------- Vues ---------- */
  const todayView = () => {
    const overdue = visible.filter((x) => x.status !== "done" && x.due_date && x.due_date < today);
    const now = visible.filter((x) => x.status !== "done" && x.due_date === today);
    const noDate = visible.filter((x) => x.status !== "done" && !x.due_date);
    const doneToday = visible.filter((x) => x.status === "done" && x.done_at?.slice(0, 10) === today);
    const sections: [string, Task[]][] = [
      [t.perso.tasks.overdue, overdue],
      [t.perso.tasks.views.today, now],
      [t.perso.tasks.noDate, noDate],
      [t.perso.tasks.status.done, doneToday],
    ];
    const any = sections.some(([, l]) => l.length);
    if (!any) {
      const soon = visible.filter((x) => x.status !== "done" && x.due_date && x.due_date > today && x.due_date <= addDays(today, 7)).length;
      return (
        <EmptyShowcase
          icon={CalendarCheck}
          title={t.perso.tasks.emptyToday}
          text={soon ? format(t.perso.tasks.upcoming, { n: soon }) : t.perso.tasks.emptyTodayText}
          action={
            <Button variant="secondary" size="sm" onClick={() => setView("week")}>
              {t.perso.tasks.seeWeek}
            </Button>
          }
        />
      );
    }
    return sections
      .filter(([, l]) => l.length)
      .map(([label, l]) => (
        <div key={label}>
          <p className={s.section}>{label}</p>
          <ul className={s.taskList}>{l.map((x) => <Row key={x.id} task={x} />)}</ul>
        </div>
      ));
  };

  const weekView = () => (
    <div className={s.week}>
      {Array.from({ length: 7 }, (_, i) => addDays(today, i)).map((d) => {
        const items = visible.filter((x) => x.due_date === d && (x.status !== "done" || x.done_at?.slice(0, 10) === d || d === today));
        return (
          <div key={d} className={s.weekCol}>
            <span className={s.weekHead} data-today={d === today ? "" : undefined}>{fmt(d, { weekday: "short", day: "numeric" })}</span>
            {items.map((x) => (
              <button key={x.id} className={s.mini} data-done={x.status === "done" ? "" : undefined} onClick={() => setStatus(x, x.status === "done" ? "todo" : "done")}>
                <span className={s.check} role="checkbox" aria-checked={x.status === "done"} style={{ width: 16, height: 16 }}>{x.status === "done" && <Check size={10} strokeWidth={3} />}</span>
                <span>{x.title}</span>
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );

  const kanbanView = () => (
    <div className={s.kanban}>
      {(["todo", "doing", "done"] as TaskStatus[]).map((st) => {
        const items = visible.filter((x) => x.status === st);
        return (
          <div
            key={st}
            className={s.kcol}
            data-over={overCol === st ? "" : undefined}
            onDragOver={(e) => {
              e.preventDefault();
              setOverCol(st);
            }}
            onDragLeave={() => setOverCol(null)}
            onDrop={() => {
              const task = list.find((x) => x.id === dragId);
              if (task && task.status !== st) setStatus(task, st);
              setDragId(null);
              setOverCol(null);
            }}
          >
            <span className={s.kcolHead}>
              {t.perso.tasks.status[st]} <span>{items.length}</span>
            </span>
            {items.map((x) => (
              <div
                key={x.id}
                className={s.card}
                draggable
                data-dragging={dragId === x.id ? "" : undefined}
                onDragStart={() => setDragId(x.id)}
                onDragEnd={() => setDragId(null)}
              >
                <span>{x.title}</span>
                <span className={s.taskMeta}>
                  <span>{t.perso.tasks.spaces[x.space]}</span>
                  {x.due_date && <span>{fmt(x.due_date, { day: "numeric", month: "short" })}</span>}
                </span>
                <span className={s.chips}>
                  {(["todo", "doing", "done"] as TaskStatus[]).filter((o) => o !== st).map((o) => (
                    <button key={o} className={s.subtle} onClick={() => setStatus(x, o)} style={{ textDecoration: "underline" }}>
                      {t.perso.tasks.status[o]}
                    </button>
                  ))}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );

  const calendarView = () => {
    const [y, m] = today.split("-").map(Number);
    const first = `${y}-${String(m).padStart(2, "0")}-01`;
    const pad = (new Date(first + "T12:00:00Z").getUTCDay() + 6) % 7;
    const start0 = addDays(first, -pad);
    const cells = Array.from({ length: 42 }, (_, i) => addDays(start0, i));
    const heads = Array.from({ length: 7 }, (_, i) => fmt(addDays(start0, i), { weekday: "short" }));
    return (
      <div className={s.cal}>
        {heads.map((h) => <span key={h} className={s.calHead}>{h.replace(".", "")}</span>)}
        {cells.map((d) => {
          const items = visible.filter((x) => x.due_date === d);
          return (
            <div key={d} className={s.calDay} data-out={d.slice(5, 7) !== first.slice(5, 7) ? "" : undefined} data-today={d === today ? "" : undefined} data-has={items.length ? "" : undefined}>
              <span className={s.calNum}>{Number(d.slice(8))}</span>
              {items.slice(0, 3).map((x) => (
                <span key={x.id} className={s.calTask} data-done={x.status === "done" ? "" : undefined} title={x.title}>{x.title}</span>
              ))}
              {items.length > 3 && <span className={s.subtle}>+{items.length - 3}</span>}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card fill>
      <div className={s.toolbar}>
        <Segmented<View>
          value={view}
          onChange={setView}
          options={(["today", "week", "kanban", "calendar"] as View[]).map((v) => ({ value: v, label: t.perso.tasks.views[v] }))}
        />
        <div className={s.chips} hidden={!!lockedSpace}>
          {(["all", "perso", "agence", "islam"] as Filter[]).map((f) => (
            <Chip key={f} on={filter === f} onClick={() => setFilter(f)}>{t.perso.tasks.spaces[f]}</Chip>
          ))}
        </div>
      </div>

      <form
        className={s.addBar}
        data-open={title.trim() ? "" : undefined}
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await createTask({ title, space, due_date: due || null, priority: Number(prio), recurrence: recur === "none" ? null : recur });
            if (r.ok) setTitle("");
            else toast.error(t.perso.error);
          });
        }}
      >
        <input className={inputClass} value={title} maxLength={200} placeholder={t.perso.tasks.placeholder} onChange={(e) => setTitle(e.target.value)} autoFocus={autoFocus} aria-label={t.perso.tasks.new} />
        <select className={inputClass} value={space} onChange={(e) => setSpace(e.target.value as TaskSpace)} aria-label={t.perso.tasks.space}>
          {(["perso", "agence", "islam"] as TaskSpace[]).map((sp) => <option key={sp} value={sp}>{t.perso.tasks.spaces[sp]}</option>)}
        </select>
        <input className={inputClass} type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label={t.perso.tasks.due} />
        <select className={inputClass} value={prio} onChange={(e) => setPrio(e.target.value)} aria-label={t.perso.tasks.prio}>
          {[2, 1, 0].map((p) => <option key={p} value={p}>{t.perso.tasks.priority[p as 0 | 1 | 2]}</option>)}
        </select>
        <select className={inputClass} value={recur} onChange={(e) => setRecur(e.target.value as "none" | Recurrence)} aria-label={t.perso.tasks.repeat}>
          {(["none", "daily", "weekdays", "weekly", "monthly"] as const).map((r) => <option key={r} value={r}>{t.perso.tasks.recurrence[r]}</option>)}
        </select>
        <Button type="submit" disabled={pending || !title.trim()}>
          <Plus size={15} aria-hidden /> {t.perso.tasks.add}
        </Button>
      </form>

      <ScrollArea>
        {view === "today" ? todayView() : view === "week" ? weekView() : view === "kanban" ? kanbanView() : calendarView()}
      </ScrollArea>
    </Card>
  );
}
