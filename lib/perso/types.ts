/** Types partagés de l'espace Développement perso. */
export type Habit = { id: string; title: string; frequency: "daily" | "weekly"; per_week: number; logs: string[] };

export type TaskSpace = "perso" | "agence" | "islam";
export type TaskStatus = "todo" | "doing" | "done";
export type Recurrence = "daily" | "weekdays" | "weekly" | "monthly";
export type Task = {
  id: string;
  title: string;
  space: TaskSpace;
  status: TaskStatus;
  priority: 0 | 1 | 2;
  due_date: string | null;
  recurrence: Recurrence | null;
  notes: string;
  done_at: string | null;
  created_at: string;
};

export type FocusSession = { id: string; started_at: string; minutes: number; mode: "pomodoro" | "free"; label: string; task_id: string | null };

export type Goal = { id: string; title: string; why: string; target_date: string | null; done_at: string | null; steps: { id: string; title: string; done_at: string | null }[] };
