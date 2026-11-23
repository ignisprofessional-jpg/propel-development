-- ============================================================================
-- Étape 6 — Agence Propel : prospects/clients, historique, paiements (prêts pour
-- Stripe), devis et factures, mails Gmail (lecture seule), infos d'entreprise.
-- ============================================================================

create table if not exists public.agency_leads (
  id uuid primary key default gen_random_uuid(),
  business text not null check (char_length(business) between 1 and 120),
  contact_name text not null default '',
  email text not null default '',
  phone text not null default '',
  city text not null default '',
  source text not null default '',
  offer text not null default '',
  amount numeric(10, 2) not null default 0 check (amount >= 0),
  stage text not null default 'new' check (stage in ('new', 'contacted', 'mockup', 'quote', 'signed', 'lost')),
  notes text not null default '',
  signed_at timestamptz,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists agency_leads_stage_idx on public.agency_leads (stage);
create index if not exists agency_leads_email_idx on public.agency_leads (lower(email));

create table if not exists public.agency_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.agency_leads (id) on delete cascade,
  kind text not null default 'note' check (kind in ('note', 'stage', 'email', 'call', 'payment', 'document', 'task')),
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists agency_activities_lead_idx on public.agency_activities (lead_id, created_at desc);

alter table public.tasks add column if not exists lead_id uuid references public.agency_leads (id) on delete set null;

-- Paiements : saisie manuelle aujourd'hui, colonnes stripe_* prêtes pour plus tard
create table if not exists public.agency_payments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.agency_leads (id) on delete set null,
  label text not null check (char_length(label) between 1 and 160),
  kind text not null default 'other' check (kind in ('deposit', 'balance', 'subscription', 'other')),
  amount numeric(10, 2) not null check (amount > 0),
  due_date date,
  paid_at timestamptz,
  method text not null default '',
  provider text not null default 'manual' check (provider in ('manual', 'stripe')),
  stripe_customer_id text,
  stripe_payment_intent_id text,
  stripe_invoice_id text,
  stripe_checkout_session_id text,
  created_at timestamptz not null default now()
);
create index if not exists agency_payments_due_idx on public.agency_payments (paid_at, due_date);

create table if not exists public.agency_documents (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.agency_leads (id) on delete set null,
  kind text not null check (kind in ('quote', 'invoice')),
  number text not null unique,
  issued_on date not null default current_date,
  due_on date,
  lines jsonb not null default '[]'::jsonb,
  vat_rate numeric(5, 2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'paid', 'cancelled')),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.agency_emails (
  id uuid primary key default gen_random_uuid(),
  gmail_id text not null unique,
  thread_id text not null,
  from_email text not null default '',
  from_name text not null default '',
  subject text not null default '',
  snippet text not null default '',
  received_at timestamptz not null,
  lead_id uuid references public.agency_leads (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists agency_emails_received_idx on public.agency_emails (received_at desc);

-- Infos d'entreprise pour les devis et factures (vides tant qu'il n'y a pas de SIRET)
alter table public.dash_settings
  add column if not exists company_name text not null default 'Propel Agency',
  add column if not exists company_address text not null default '',
  add column if not exists company_email text not null default '',
  add column if not exists siret text not null default '',
  add column if not exists vat_number text not null default '',
  add column if not exists vat_rate numeric(5, 2) not null default 0;

-- Jeton Gmail : jamais lisible par l'API ; écrit et lu seulement via les fonctions ci-dessous
create table if not exists dashboard_private.google_tokens (
  id smallint primary key default 1 check (id = 1),
  email text not null default '',
  refresh_token text not null,
  updated_at timestamptz not null default now()
);

create or replace function public.dashboard_save_google_token(p_email text, p_refresh_token text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.dashboard_session_valid() then return false; end if;
  insert into dashboard_private.google_tokens (id, email, refresh_token) values (1, coalesce(p_email, ''), p_refresh_token)
  on conflict (id) do update set email = excluded.email, refresh_token = excluded.refresh_token, updated_at = now();
  return true;
end $$;

create or replace function public.dashboard_google_token()
returns table (email text, refresh_token text) language sql stable security definer set search_path = '' as $$
  select email, refresh_token from dashboard_private.google_tokens where id = 1 and public.dashboard_session_valid();
$$;

create or replace function public.dashboard_google_status()
returns table (connected boolean, email text) language sql stable security definer set search_path = '' as $$
  select exists (select 1 from dashboard_private.google_tokens), coalesce((select email from dashboard_private.google_tokens where id = 1), '')
  where public.dashboard_session_valid();
$$;

create or replace function public.dashboard_google_disconnect()
returns void language sql volatile security definer set search_path = '' as $$
  delete from dashboard_private.google_tokens where public.dashboard_session_valid();
$$;

revoke all on function public.dashboard_save_google_token(text, text) from public;
revoke all on function public.dashboard_google_token() from public;
revoke all on function public.dashboard_google_status() from public;
revoke all on function public.dashboard_google_disconnect() from public;
grant execute on function public.dashboard_save_google_token(text, text) to anon, authenticated;
grant execute on function public.dashboard_google_token() to anon, authenticated;
grant execute on function public.dashboard_google_status() to anon, authenticated;
grant execute on function public.dashboard_google_disconnect() to anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['agency_leads', 'agency_activities', 'agency_payments', 'agency_documents', 'agency_emails'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists dashboard_session on public.%I', t);
    execute format(
      'create policy dashboard_session on public.%I for all to anon, authenticated
         using ((select public.dashboard_session_valid()))
         with check ((select public.dashboard_session_valid()))', t);
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
  end loop;
end $$;
