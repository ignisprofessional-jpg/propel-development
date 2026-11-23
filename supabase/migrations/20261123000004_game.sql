-- ============================================================================
-- Étape 4 — Système de jeu : expérience, pièces, quêtes en arbre, marché.
-- RLS + accès par jeton de session, comme les autres tables du dashboard.
-- ============================================================================

create table if not exists public.game_xp_events (
  id bigint generated always as identity primary key,
  amount integer not null check (amount between -100000 and 100000),
  source text not null check (source in ('quest_step', 'quest', 'prayer', 'quran', 'adhkar', 'focus', 'habit', 'task', 'manual')),
  label text not null default '',
  ref text,
  created_at timestamptz not null default now()
);
-- Index complet (les NULL restent distincts) : nécessaire pour « on conflict (source, ref) ».
create unique index if not exists game_xp_events_ref_idx on public.game_xp_events (source, ref);
create index if not exists game_xp_events_created_idx on public.game_xp_events (created_at desc);

create table if not exists public.game_coin_events (
  id bigint generated always as identity primary key,
  amount integer not null check (amount between -100000 and 100000),
  source text not null check (source in ('quest', 'purchase', 'manual')),
  label text not null default '',
  ref text,
  created_at timestamptz not null default now()
);
create unique index if not exists game_coin_events_ref_idx on public.game_coin_events (source, ref);

create table if not exists public.game_rewards (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  cost integer not null check (cost between 1 and 100000),
  note text not null default '',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.game_purchases (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid references public.game_rewards (id) on delete set null,
  title text not null,
  cost integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.game_quests (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  style text not null default 'solid' check (style in ('solid', 'outline', 'dashed')),
  reward_xp integer not null default 100 check (reward_xp between 0 and 100000),
  reward_coins integer not null default 20 check (reward_coins between 0 and 100000),
  sort smallint not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.game_quest_nodes (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references public.game_quests (id) on delete cascade,
  kind text not null default 'step' check (kind in ('root', 'step')),
  title text not null check (char_length(title) between 1 and 80),
  x real not null default 0,
  y real not null default 0,
  xp integer not null default 20 check (xp between 0 and 100000),
  rule jsonb,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists game_quest_nodes_quest_idx on public.game_quest_nodes (quest_id);

create table if not exists public.game_quest_edges (
  quest_id uuid not null references public.game_quests (id) on delete cascade,
  source uuid not null references public.game_quest_nodes (id) on delete cascade,
  target uuid not null references public.game_quest_nodes (id) on delete cascade,
  primary key (source, target),
  check (source <> target)
);

-- Totaux (exécutée avec les droits de l'appelant : RLS s'applique)
create or replace function public.dashboard_game_totals()
returns table (xp bigint, coins bigint)
language sql
stable
set search_path = ''
as $$
  select
    (select coalesce(sum(amount), 0) from public.game_xp_events),
    (select coalesce(sum(amount), 0) from public.game_coin_events);
$$;
grant execute on function public.dashboard_game_totals() to anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'game_xp_events', 'game_coin_events', 'game_rewards', 'game_purchases',
    'game_quests', 'game_quest_nodes', 'game_quest_edges'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists dashboard_session on public.%I', t);
    execute format(
      'create policy dashboard_session on public.%I for all to anon, authenticated
         using ((select public.dashboard_session_valid()))
         with check ((select public.dashboard_session_valid()))', t);
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
  end loop;
end $$;

-- Quête de départ (modifiable). Arbre : la racine « Vision » en haut ; une étape
-- se débloque quand les étapes placées sous elle (ses enfants) sont faites.
-- Les étapes ont une règle : elles se valident toutes seules à partir de tes données.
do $$
declare q uuid; r uuid; a uuid; a1 uuid; b uuid; b1 uuid; c uuid; d uuid;
begin
  if exists (select 1 from public.game_quests) then return; end if;
  insert into public.game_quests (title, reward_xp, reward_coins) values ('Le début d''une aventure', 150, 30) returning id into q;
  insert into public.game_quest_nodes (quest_id, kind, title, x, y, xp) values (q, 'root', 'Vision', 0, 0, 0) returning id into r;
  insert into public.game_quest_nodes (quest_id, title, x, y, rule) values (q, 'Prier les 5 prières 7 jours', -330, 160, '{"type":"prayer_full_days","value":7}') returning id into a;
  insert into public.game_quest_nodes (quest_id, title, x, y, rule) values (q, 'Prier les 5 prières un jour', -330, 320, '{"type":"prayer_full_days","value":1}') returning id into a1;
  insert into public.game_quest_nodes (quest_id, title, x, y, rule) values (q, 'Lire 20 pages de Coran', -110, 160, '{"type":"quran_pages","value":20}') returning id into b;
  insert into public.game_quest_nodes (quest_id, title, x, y, rule) values (q, 'Lire 1 page de Coran', -110, 320, '{"type":"quran_pages","value":1}') returning id into b1;
  insert into public.game_quest_nodes (quest_id, title, x, y, rule) values (q, 'Mémoriser Al-Ikhlâs', 110, 160, '{"type":"hifz","surah":112}') returning id into c;
  insert into public.game_quest_nodes (quest_id, title, x, y, rule) values (q, 'Créer une récompense dans le Marché', 330, 160, '{"type":"rewards","value":1}') returning id into d;
  insert into public.game_quest_edges (quest_id, source, target) values (q, r, a), (q, a, a1), (q, r, b), (q, b, b1), (q, r, c), (q, r, d);
end $$;
