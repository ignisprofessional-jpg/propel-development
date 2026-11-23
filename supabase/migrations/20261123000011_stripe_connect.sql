-- Connexion Stripe depuis Paramètres. Les clés restent dans dashboard_private :
-- jamais lisibles par l'API publique, seulement via les fonctions ci-dessous.

alter table public.agency_payments
  add column if not exists stripe_link_id text,
  add column if not exists stripe_link_url text;

create table if not exists dashboard_private.stripe (
  id smallint primary key default 1 check (id = 1),
  secret_key text not null,
  webhook_secret text not null default '',
  account_name text not null default '',
  livemode boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Écriture (session du dashboard obligatoire)
create or replace function public.dashboard_save_stripe(p_secret text, p_account text, p_livemode boolean)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.dashboard_session_valid() then return false; end if;
  insert into dashboard_private.stripe (id, secret_key, account_name, livemode)
  values (1, p_secret, coalesce(p_account, ''), coalesce(p_livemode, false))
  on conflict (id) do update set secret_key = excluded.secret_key, account_name = excluded.account_name, livemode = excluded.livemode, updated_at = now();
  return true;
end $$;

create or replace function public.dashboard_save_stripe_webhook(p_secret text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.dashboard_session_valid() then return false; end if;
  update dashboard_private.stripe set webhook_secret = coalesce(p_secret, ''), updated_at = now() where id = 1;
  return found;
end $$;

-- État affichable (jamais la clé entière)
create or replace function public.dashboard_stripe_status()
returns table (connected boolean, account_name text, livemode boolean, key_hint text, has_webhook boolean)
language sql stable security definer set search_path = '' as $$
  select true, s.account_name, s.livemode, right(s.secret_key, 4), s.webhook_secret <> ''
  from dashboard_private.stripe s where s.id = 1 and public.dashboard_session_valid();
$$;

-- Clé pour les appels serveur (session obligatoire)
create or replace function public.dashboard_stripe_key()
returns text language sql stable security definer set search_path = '' as $$
  select secret_key from dashboard_private.stripe where id = 1 and public.dashboard_session_valid();
$$;

create or replace function public.dashboard_stripe_disconnect()
returns void language sql volatile security definer set search_path = '' as $$
  delete from dashboard_private.stripe where public.dashboard_session_valid();
$$;

-- Webhook Stripe (sans session) : protégé par le jeton d'ingestion du serveur
create or replace function public.dashboard_stripe_webhook_secret(p_token text)
returns text language sql stable security definer set search_path = '' as $$
  select s.webhook_secret from dashboard_private.stripe s, dashboard_private.ingest i
  where s.id = 1 and i.id = 1 and p_token is not null and length(p_token) >= 32
    and i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

create or replace function public.dashboard_stripe_mark_paid(p_token text, p_payment_id uuid, p_session_id text, p_intent_id text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_token is null or length(p_token) < 32 or not exists (
    select 1 from dashboard_private.ingest where id = 1 and token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  ) then return false; end if;
  update public.agency_payments
     set paid_at = coalesce(paid_at, now()), provider = 'stripe', method = 'Stripe',
         stripe_checkout_session_id = p_session_id, stripe_payment_intent_id = p_intent_id
   where id = p_payment_id;
  return found;
end $$;

revoke all on function public.dashboard_save_stripe(text, text, boolean) from public;
revoke all on function public.dashboard_save_stripe_webhook(text) from public;
revoke all on function public.dashboard_stripe_status() from public;
revoke all on function public.dashboard_stripe_key() from public;
revoke all on function public.dashboard_stripe_disconnect() from public;
revoke all on function public.dashboard_stripe_webhook_secret(text) from public;
revoke all on function public.dashboard_stripe_mark_paid(text, uuid, text, text) from public;
grant execute on function public.dashboard_save_stripe(text, text, boolean) to anon, authenticated;
grant execute on function public.dashboard_save_stripe_webhook(text) to anon, authenticated;
grant execute on function public.dashboard_stripe_status() to anon, authenticated;
grant execute on function public.dashboard_stripe_key() to anon, authenticated;
grant execute on function public.dashboard_stripe_disconnect() to anon, authenticated;
grant execute on function public.dashboard_stripe_webhook_secret(text) to anon, authenticated;
grant execute on function public.dashboard_stripe_mark_paid(text, uuid, text, text) to anon, authenticated;
