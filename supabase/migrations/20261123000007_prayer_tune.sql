-- Ajustement des horaires de prière (en minutes, par prière) pour coller à la mosquée locale.
alter table public.dash_settings add column if not exists prayer_tune jsonb not null default '{"fajr":0,"dhuhr":0,"asr":0,"maghrib":0,"isha":0}'::jsonb;
