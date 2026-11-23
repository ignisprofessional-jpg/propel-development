-- ============================================================================
-- Lecture de la progression Rûh depuis le dashboard (lecture seule).
-- Rûh enregistre déjà toute sa progression dans public.progress (une ligne par
-- compte). Le dashboard n'a pas de compte Supabase : il lit cette ligne via une
-- fonction, uniquement avec un jeton de session valide, pour le compte Rûh relié
-- dans Paramètres. La table progress et ses politiques ne sont pas modifiées.
-- ============================================================================

alter table public.dash_settings add column if not exists ruh_user_id uuid;

-- Progression Rûh du compte relié (vide si non relié ou sans session valide).
create or replace function public.dashboard_ruh_progress()
returns table (data jsonb, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.data, p.updated_at
  from public.progress p
  join public.dash_settings s on s.id = 1
  where p.user_id = s.ruh_user_id
    and public.dashboard_session_valid();
$$;

-- Relie le compte Rûh qui utilise cet e-mail. Renvoie vrai si un compte existe.
create or replace function public.dashboard_link_ruh(p_email text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare v_id uuid;
begin
  if not public.dashboard_session_valid() then
    return false;
  end if;
  select id into v_id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_id is null then
    return false;
  end if;
  update public.dash_settings set ruh_user_id = v_id, updated_at = now() where id = 1;
  return true;
end;
$$;

create or replace function public.dashboard_unlink_ruh()
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.dash_settings set ruh_user_id = null, updated_at = now()
  where id = 1 and public.dashboard_session_valid();
$$;

revoke all on function public.dashboard_ruh_progress() from public;
revoke all on function public.dashboard_link_ruh(text) from public;
revoke all on function public.dashboard_unlink_ruh() from public;
grant execute on function public.dashboard_ruh_progress() to anon, authenticated;
grant execute on function public.dashboard_link_ruh(text) to anon, authenticated;
grant execute on function public.dashboard_unlink_ruh() to anon, authenticated;
