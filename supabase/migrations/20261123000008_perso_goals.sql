-- Objectifs à long terme découpés en étapes (Développement perso).
create table if not exists public.perso_goals (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  why text not null default '',
  target_date date,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.perso_goal_steps (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.perso_goals (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  done_at timestamptz,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
do $$
declare t text;
begin
  foreach t in array array['perso_goals', 'perso_goal_steps'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists dashboard_session on public.%I', t);
    execute format(
      'create policy dashboard_session on public.%I for all to anon, authenticated
         using ((select public.dashboard_session_valid()))
         with check ((select public.dashboard_session_valid()))', t);
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
  end loop;
end $$;
