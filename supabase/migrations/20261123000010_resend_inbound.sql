-- Mails reçus via Resend (webhook « email.received ») à la place de Gmail.
-- Le webhook arrive sans session : il passe par une fonction protégée par un jeton
-- d'ingestion dont seul le hash est stocké ici (le jeton vit dans .env.local).

alter table public.agency_emails rename column gmail_id to external_id;
alter table public.agency_emails alter column thread_id drop not null;
alter table public.agency_emails
  add column if not exists source text not null default 'resend' check (source in ('gmail', 'resend')),
  add column if not exists to_email text not null default '',
  add column if not exists body text not null default '';

-- Plus de Gmail
drop function if exists public.dashboard_save_google_token(text, text);
drop function if exists public.dashboard_google_token();
drop function if exists public.dashboard_google_status();
drop function if exists public.dashboard_google_disconnect();
drop table if exists dashboard_private.google_tokens;

create table if not exists dashboard_private.ingest (
  id smallint primary key default 1 check (id = 1),
  token_hash text not null,
  updated_at timestamptz not null default now()
);

create or replace function public.dashboard_ingest_email(
  p_token text,
  p_external_id text,
  p_from_email text,
  p_from_name text,
  p_to_email text,
  p_subject text,
  p_snippet text,
  p_body text,
  p_received_at timestamptz,
  p_message_id text
) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_lead uuid;
begin
  if p_token is null or length(p_token) < 32 or not exists (
    select 1 from dashboard_private.ingest
    where id = 1 and token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  ) then
    return false;
  end if;

  select id into v_lead from public.agency_leads
  where lower(email) = lower(coalesce(p_from_email, '')) and email <> ''
  order by created_at desc limit 1;

  insert into public.agency_emails (external_id, source, thread_id, from_email, from_name, to_email, subject, snippet, body, received_at, lead_id)
  values (
    left(p_external_id, 200), 'resend', left(p_message_id, 300),
    left(coalesce(p_from_email, ''), 200), left(coalesce(p_from_name, ''), 200), left(coalesce(p_to_email, ''), 300),
    left(coalesce(p_subject, ''), 500), left(coalesce(p_snippet, ''), 400), left(coalesce(p_body, ''), 50000),
    coalesce(p_received_at, now()), v_lead
  )
  on conflict (external_id) do nothing;
  return true;
end $$;

revoke all on function public.dashboard_ingest_email(text, text, text, text, text, text, text, text, timestamptz, text) from public;
grant execute on function public.dashboard_ingest_email(text, text, text, text, text, text, text, text, timestamptz, text) to anon, authenticated;
