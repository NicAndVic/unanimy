create extension if not exists pgcrypto;

create table if not exists public.staff_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

create table if not exists public.app_config (
  key text primary key,
  value_json jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id)
);

insert into public.app_config(key, value_json)
values
  ('decision_ttl_seconds', '{"default": 7200, "restaurants": 7200, "streaming": 86400}'::jsonb),
  ('google_cache_ttl_seconds', '{"places_search": 900, "place_details": 86400}'::jsonb),
  ('decision_defaults', '{"maxOptions": 10}'::jsonb)
on conflict (key) do nothing;

create table if not exists public.api_usage_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  provider text not null,
  endpoint text not null,
  status int null,
  latency_ms int null,
  decision_id uuid null references public.decisions(id) on delete set null,
  meta jsonb null
);

create index if not exists api_usage_events_created_at_idx on public.api_usage_events(created_at);
create index if not exists api_usage_events_provider_endpoint_created_at_idx on public.api_usage_events(provider, endpoint, created_at);
create index if not exists decisions_status_idx on public.decisions(status);
create index if not exists decisions_expires_at_idx on public.decisions(expires_at);
create index if not exists decisions_opened_at_idx on public.decisions(opened_at);

alter table public.staff_users enable row level security;
alter table public.app_config enable row level security;
alter table public.api_usage_events enable row level security;

drop policy if exists staff_users_staff_read on public.staff_users;
create policy staff_users_staff_read on public.staff_users for select
using (exists (select 1 from public.staff_users su where su.user_id = auth.uid()));

drop policy if exists staff_users_service_all on public.staff_users;
create policy staff_users_service_all on public.staff_users for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
