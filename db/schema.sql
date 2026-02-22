-- ASCII only; regenerated to remove hidden unicode.
-- Unanimy MVP schema
-- Idempotent PostgreSQL DDL for Supabase

create extension if not exists pgcrypto;

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid,
  display_name text not null,
  role text not null default 'member' check (role in ('member', 'admin')),
  is_active boolean not null default true,
  joined_at timestamptz not null default now()
);

create unique index if not exists group_members_group_user_unique
  on group_members(group_id, user_id)
  where user_id is not null;

create index if not exists group_members_group_id_idx
  on group_members(group_id);

create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id),
  created_by_user_id uuid,
  decision_type text not null,
  algorithm text not null check (algorithm in ('collective', 'most_satisfied')),
  allow_veto boolean not null default true,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  criteria_json jsonb not null default '{}'::jsonb,
  max_options int not null default 10,
  sort_by text not null default 'rating' check (sort_by in ('rating', 'review_count', 'distance')),
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  expires_at timestamptz,
  organizer_key_hash text,
  closed_at timestamptz
);

alter table public.decisions
  add column if not exists expires_at timestamptz,
  add column if not exists organizer_key_hash text;

update public.decisions
set expires_at = opened_at + interval '2 hours'
where expires_at is null and opened_at is not null;

create index if not exists decisions_group_created_idx
  on decisions(group_id, created_at);

create index if not exists decisions_status_idx
  on decisions(status);

create index if not exists decisions_expires_at_idx
  on decisions(expires_at);

create table if not exists decision_join_codes (
  decision_id uuid primary key references decisions(id) on delete cascade,
  code char(5) not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists decision_join_codes_code_idx
  on decision_join_codes(code);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  user_id uuid,
  participant_token text not null,
  role text not null default 'member' check (role in ('member', 'organizer')),
  joined_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists participants_decision_token_unique
  on participants(decision_id, participant_token);

create unique index if not exists participants_decision_user_unique
  on participants(decision_id, user_id)
  where user_id is not null;

create index if not exists participants_decision_id_idx
  on participants(decision_id);

create index if not exists participants_decision_completed_idx
  on participants(decision_id, completed_at);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_item_id text not null,
  name text,
  primary_type text,
  lat double precision,
  lng double precision,
  latlng_cached_at timestamptz,
  times_shown bigint not null default 0,
  avg_experience_rating numeric(3,2),
  experience_rating_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_item_id)
);

create table if not exists decision_items (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  item_id uuid not null references items(id) on delete restrict,
  display_order int not null,
  snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (decision_id, item_id)
);

create index if not exists decision_items_decision_display_order_idx
  on decision_items(decision_id, display_order);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  decision_item_id uuid not null references decision_items(id) on delete cascade,
  value smallint not null check (value in (-2, -1, 0, 1, 2)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, decision_item_id)
);

create index if not exists votes_decision_item_id_idx
  on votes(decision_item_id);

create index if not exists votes_participant_id_idx
  on votes(participant_id);

create table if not exists google_place_cache (
  place_id text not null,
  field_mask text not null,
  payload jsonb not null,
  cached_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (place_id, field_mask)
);

create index if not exists google_place_cache_expires_at_idx
  on google_place_cache(expires_at);

create table if not exists decision_results (
  decision_id uuid primary key references decisions(id) on delete cascade,
  winning_decision_item_id uuid not null references decision_items(id),
  summary_json jsonb not null,
  internal_ranked_json jsonb,
  computed_at timestamptz not null default now()
);

create table if not exists decision_feedback (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  reaction smallint not null,
  created_at timestamptz not null default now(),
  unique (decision_id, participant_id)
);

create table if not exists experience_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null,
  provider_item_id text not null,
  decision_id uuid,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

create unique index if not exists experience_ratings_with_decision_unique
  on experience_ratings(user_id, provider, provider_item_id, decision_id)
  where decision_id is not null;

create unique index if not exists experience_ratings_without_decision_unique
  on experience_ratings(user_id, provider, provider_item_id)
  where decision_id is null;

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_name_created_at_idx
  on events(event_name, created_at);

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

create index if not exists api_usage_events_created_at_idx
  on public.api_usage_events(created_at);

create index if not exists api_usage_events_provider_endpoint_created_at_idx
  on public.api_usage_events(provider, endpoint, created_at);

create index if not exists decisions_opened_at_idx
  on public.decisions(opened_at);

alter table public.staff_users enable row level security;
alter table public.app_config enable row level security;
alter table public.api_usage_events enable row level security;

drop policy if exists staff_users_staff_read on public.staff_users;
create policy staff_users_staff_read on public.staff_users
for select
using (exists (select 1 from public.staff_users su where su.user_id = auth.uid()));

drop policy if exists staff_users_service_all on public.staff_users;
create policy staff_users_service_all on public.staff_users
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
