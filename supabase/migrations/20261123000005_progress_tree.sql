-- ============================================================================
-- Arbre de progression (remplace les quêtes) + suppression du marché et des pièces.
-- Les paliers sont définis dans le code (lib/game/tree.ts) et se valident tout
-- seuls à partir des données. On garde seulement la date d'obtention de chaque palier.
-- ============================================================================

drop table if exists public.game_quest_edges;
drop table if exists public.game_quest_nodes;
drop table if exists public.game_quests;
drop table if exists public.game_purchases;
drop table if exists public.game_rewards;
drop table if exists public.game_coin_events;

create table if not exists public.game_milestones (
  id text primary key check (char_length(id) between 1 and 80),
  achieved_at timestamptz not null default now()
);
alter table public.game_milestones enable row level security;
drop policy if exists dashboard_session on public.game_milestones;
create policy dashboard_session on public.game_milestones for all to anon, authenticated
  using ((select public.dashboard_session_valid()))
  with check ((select public.dashboard_session_valid()));
grant select, insert, update, delete on public.game_milestones to anon, authenticated;

-- Sources d'XP : paliers de l'arbre + actions (prières, Coran, adhkar, concentration, habitudes, tâches)
alter table public.game_xp_events drop constraint if exists game_xp_events_source_check;
alter table public.game_xp_events add constraint game_xp_events_source_check
  check (source in ('milestone', 'prayer', 'quran', 'adhkar', 'focus', 'habit', 'task', 'manual'));

drop function if exists public.dashboard_game_totals();
create function public.dashboard_game_totals()
returns table (xp bigint)
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(amount), 0) from public.game_xp_events;
$$;
grant execute on function public.dashboard_game_totals() to anon, authenticated;
