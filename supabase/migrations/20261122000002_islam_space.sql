-- ============================================================================
-- Étape 3 — Réglages + espace Islam (prières, Coran, adhkar, dhikr).
-- Toutes les tables : RLS activé, accès uniquement avec un jeton de session
-- valide (voir 20261122000001_dashboard_pin_auth.sql). Aucune table de Rûh touchée.
-- ============================================================================

-- ---------- Réglages (une seule ligne) ----------
create table if not exists public.dash_settings (
  id smallint primary key default 1 check (id = 1),
  first_name text not null default '',
  city text not null default 'Paris',
  latitude double precision not null default 48.8566,
  longitude double precision not null default 2.3522,
  timezone text not null default 'Europe/Paris',
  calc_method text not null default 'france12',
  madhab text not null default 'shafi' check (madhab in ('shafi', 'hanafi')),
  quran_daily_pages smallint not null default 20 check (quran_daily_pages between 1 and 604),
  khatm_days smallint not null default 30 check (khatm_days between 1 and 3650),
  khatm_started_on date not null default current_date,
  no_xp_for_worship boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.dash_settings (id) values (1) on conflict (id) do nothing;

-- ---------- Prières ----------
create table if not exists public.islam_prayer_logs (
  day date not null,
  prayer text not null check (prayer in ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha')),
  status text not null check (status in ('on_time', 'late', 'qada')),
  logged_at timestamptz not null default now(),
  primary key (day, prayer)
);

create table if not exists public.islam_nafl_logs (
  day date not null,
  kind text not null check (kind in ('sunna_fajr', 'sunna_dhuhr', 'sunna_maghrib', 'sunna_isha', 'witr', 'duha', 'tahajjud')),
  logged_at timestamptz not null default now(),
  primary key (day, kind)
);

-- ---------- Coran ----------
create table if not exists public.islam_quran_reading (
  id bigint generated always as identity primary key,
  day date not null,
  pages smallint not null check (pages between 1 and 604),
  created_at timestamptz not null default now()
);
create index if not exists islam_quran_reading_day_idx on public.islam_quran_reading (day desc);

create table if not exists public.islam_quran_position (
  id smallint primary key default 1 check (id = 1),
  page smallint not null default 1 check (page between 1 and 604),
  surah smallint not null default 1 check (surah between 1 and 114),
  updated_at timestamptz not null default now()
);
insert into public.islam_quran_position (id) values (1) on conflict (id) do nothing;

-- Mémorisation + révision espacée
create table if not exists public.islam_hifz (
  surah smallint primary key check (surah between 1 and 114),
  status text not null check (status in ('learning', 'memorized')),
  started_on date not null default current_date,
  memorized_on date,
  interval_days smallint not null default 1,
  next_review date,
  last_review date,
  reviews integer not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------- Adhkar & dhikr ----------
create table if not exists public.islam_adhkar_logs (
  day date not null,
  period text not null check (period in ('morning', 'evening')),
  items text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (day, period)
);

create table if not exists public.islam_dhikr_counters (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(label) between 1 and 80),
  arabic text,
  target integer not null default 33 check (target between 1 and 100000),
  sort smallint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.islam_dhikr_counts (
  day date not null,
  counter_id uuid not null references public.islam_dhikr_counters (id) on delete cascade,
  count integer not null default 0 check (count >= 0),
  primary key (day, counter_id)
);

insert into public.islam_dhikr_counters (label, arabic, target, sort)
select * from (values
  ('Subhân Allâh', 'سُبْحَانَ اللَّهِ', 33, 1),
  ('Al-hamdu lillâh', 'الْحَمْدُ لِلَّهِ', 33, 2),
  ('Allâhu akbar', 'اللَّهُ أَكْبَرُ', 34, 3),
  ('Astaghfirullâh', 'أَسْتَغْفِرُ اللَّهَ', 100, 4)
) as v(label, arabic, target, sort)
where not exists (select 1 from public.islam_dhikr_counters);

-- ---------- Sécurité : RLS + accès par jeton de session ----------
do $$
declare t text;
begin
  foreach t in array array[
    'dash_settings', 'islam_prayer_logs', 'islam_nafl_logs', 'islam_quran_reading',
    'islam_quran_position', 'islam_hifz', 'islam_adhkar_logs', 'islam_dhikr_counters', 'islam_dhikr_counts'
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
