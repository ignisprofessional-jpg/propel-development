-- ============================================================================
-- Accès au dashboard par code (sans compte).
-- Le code n'est JAMAIS dans ce dépôt : seul son hash bcrypt est stocké en base,
-- dans un schéma non exposé par l'API. Pour (re)définir le code, voir README.
--
-- Fonctionnement :
--   1. dashboard_login(code) compare au hash, limite les essais (5 / 15 min)
--      et renvoie un jeton de session aléatoire (seul son sha256 est stocké).
--   2. Le serveur Next garde le jeton dans un cookie httpOnly et l'envoie à
--      Supabase dans l'en-tête « x-dashboard-token ».
--   3. Les tables du dashboard ont RLS activé avec la politique
--      « dashboard_session_valid() » : sans jeton valide, rien n'est lisible.
-- Aucune table de Rûh n'est modifiée.
-- ============================================================================

create schema if not exists dashboard_private;
revoke all on schema dashboard_private from public, anon, authenticated;

create table if not exists dashboard_private.secret (
  id smallint primary key default 1 check (id = 1),
  pin_hash text not null,
  updated_at timestamptz not null default now()
);

create table if not exists dashboard_private.sessions (
  token_hash text primary key,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  user_agent text
);

create table if not exists dashboard_private.pin_attempts (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  ok boolean not null
);
create index if not exists pin_attempts_at_idx on dashboard_private.pin_attempts (at desc);

-- Jeton envoyé par le serveur Next dans l'en-tête de la requête PostgREST.
create or replace function dashboard_private.request_token_hash()
returns text
language sql
stable
set search_path = ''
as $$
  select encode(
    extensions.digest(coalesce(current_setting('request.headers', true)::json ->> 'x-dashboard-token', ''), 'sha256'),
    'hex'
  );
$$;

-- Connexion par code : renvoie un jeton, ou null si le code est faux.
create or replace function public.dashboard_login(p_pin text, p_user_agent text default null)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_hash text;
  v_fails int;
  v_token text;
begin
  select count(*) into v_fails
  from dashboard_private.pin_attempts
  where not ok and at > now() - interval '15 minutes';

  if v_fails >= 5 then
    raise exception 'too_many_attempts' using errcode = 'P0001';
  end if;

  select pin_hash into v_hash from dashboard_private.secret where id = 1;

  if v_hash is null or p_pin is null or extensions.crypt(p_pin, v_hash) <> v_hash then
    insert into dashboard_private.pin_attempts (ok) values (false);
    return null;
  end if;

  insert into dashboard_private.pin_attempts (ok) values (true);
  delete from dashboard_private.pin_attempts where at < now() - interval '30 days';
  delete from dashboard_private.sessions where expires_at < now();

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into dashboard_private.sessions (token_hash, expires_at, user_agent)
  values (encode(extensions.digest(v_token, 'sha256'), 'hex'), now() + interval '30 days', left(p_user_agent, 200));

  return v_token;
end;
$$;

-- Vrai si la requête porte un jeton de session valide (utilisé par les politiques RLS).
create or replace function public.dashboard_session_valid()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from dashboard_private.sessions
    where token_hash = dashboard_private.request_token_hash()
      and expires_at > now()
  );
$$;

-- Déconnexion : supprime la session du jeton courant.
create or replace function public.dashboard_logout()
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  delete from dashboard_private.sessions where token_hash = dashboard_private.request_token_hash();
$$;

revoke all on function public.dashboard_login(text, text) from public;
revoke all on function public.dashboard_session_valid() from public;
revoke all on function public.dashboard_logout() from public;
revoke all on function dashboard_private.request_token_hash() from public;

grant execute on function public.dashboard_login(text, text) to anon, authenticated;
grant execute on function public.dashboard_session_valid() to anon, authenticated;
grant execute on function public.dashboard_logout() to anon, authenticated;
