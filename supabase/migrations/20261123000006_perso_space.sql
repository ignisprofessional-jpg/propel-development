-- ============================================================================
-- Étape 5 — Développement perso : habitudes, tâches (partagées avec l'agence),
-- sessions de concentration. RLS + accès par jeton de session.
-- ============================================================================

create table if not exists public.perso_habits (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  frequency text not null default 'daily' check (frequency in ('daily', 'weekly')),
  per_week smallint not null default 7 check (per_week between 1 and 7),
  archived boolean not null default false,
  sort smallint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.perso_habit_logs (
  habit_id uuid not null references public.perso_habits (id) on delete cascade,
  day date not null,
  primary key (habit_id, day)
);
create index if not exists perso_habit_logs_day_idx on public.perso_habit_logs (day);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  space text not null default 'perso' check (space in ('perso', 'agence', 'islam')),
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  priority smallint not null default 1 check (priority between 0 and 2),
  due_date date,
  recurrence text check (recurrence in ('daily', 'weekdays', 'weekly', 'monthly')),
  notes text not null default '',
  done_at timestamptz,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists tasks_status_due_idx on public.tasks (status, due_date);

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  minutes integer not null check (minutes between 1 and 720),
  mode text not null default 'pomodoro' check (mode in ('pomodoro', 'free')),
  task_id uuid references public.tasks (id) on delete set null,
  label text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists focus_sessions_started_idx on public.focus_sessions (started_at desc);

do $$
declare t text;
begin
  foreach t in array array['perso_habits', 'perso_habit_logs', 'tasks', 'focus_sessions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists dashboard_session on public.%I', t);
    execute format(
      'create policy dashboard_session on public.%I for all to anon, authenticated
         using ((select public.dashboard_session_valid()))
         with check ((select public.dashboard_session_valid()))', t);
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
  end loop;
end $$;
