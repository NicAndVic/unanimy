-- Supabase / Postgres schema for group decisions
-- Safe to run in the Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create index if not exists idx_group_members_user_id on group_members(user_id);

create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  title text not null,
  description text,
  created_by uuid,
  status text not null default 'open' check (status in ('draft', 'open', 'closed', 'computed')),
  closes_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_decisions_group_created_at on decisions(group_id, created_at desc);
create index if not exists idx_decisions_status on decisions(status);

create table if not exists decision_join_codes (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  code char(5) not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint chk_decision_join_codes_code_format check (code ~ '^[A-Z0-9]{5}$'),
  unique (code)
);

create index if not exists idx_decision_join_codes_decision_expires
  on decision_join_codes(decision_id, expires_at desc);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  user_id uuid,
  anon_session_id text,
  anon_token text,
  role text not null default 'participant' check (role in ('owner', 'participant')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint chk_participants_identity
    check (user_id is not null or anon_session_id is not null),
  constraint chk_participants_anon_token
    check (anon_session_id is null or anon_token is not null)
);

create unique index if not exists uq_participants_decision_user
  on participants(decision_id, user_id)
  where user_id is not null;

create unique index if not exists uq_participants_decision_anon_session
  on participants(decision_id, anon_session_id)
  where anon_session_id is not null;

create index if not exists idx_participants_decision_completed
  on participants(decision_id, completed_at);

create index if not exists idx_participants_completed_only
  on participants(decision_id)
  where completed_at is not null;

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'google_places',
  provider_item_id text not null,
  display_name text,
  lat double precision,
  lng double precision,
  latlng_cached_at timestamptz,
  created_at timestamptz not null default now(),
  constraint uq_items_provider_provider_item_id unique (provider, provider_item_id),
  constraint chk_items_lat_range check (lat is null or (lat >= -90 and lat <= 90)),
  constraint chk_items_lng_range check (lng is null or (lng >= -180 and lng <= 180)),
  constraint chk_items_lat_lng_pair check ((lat is null) = (lng is null))
);

create table if not exists decision_items (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  item_id uuid not null references items(id) on delete restrict,
  display_order integer not null default 0,
  snapshot jsonb,
  created_at timestamptz not null default now(),
  unique (decision_id, item_id)
);

create index if not exists idx_decision_items_decision_display_order
  on decision_items(decision_id, display_order);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  decision_item_id uuid not null references decision_items(id) on delete cascade,
  user_id uuid,
  anon_session_id text,
  value smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_votes_identity check (user_id is not null or anon_session_id is not null),
  unique (participant_id, decision_item_id)
);

create unique index if not exists uq_votes_decision_item_user
  on votes(decision_id, decision_item_id, user_id)
  where user_id is not null;

create unique index if not exists uq_votes_decision_item_anon
  on votes(decision_id, decision_item_id, anon_session_id)
  where anon_session_id is not null;

create index if not exists idx_votes_decision on votes(decision_id);
create index if not exists idx_votes_decision_item on votes(decision_item_id);
create index if not exists idx_votes_decision_item_value on votes(decision_id, decision_item_id, value);

create table if not exists google_place_cache (
  place_id text not null,
  field_mask text not null,
  payload jsonb not null,
  cached_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (place_id, field_mask)
);

create index if not exists idx_google_place_cache_expires_at
  on google_place_cache(expires_at);

create table if not exists decision_results (
  decision_id uuid primary key references decisions(id) on delete cascade,
  winning_item_id uuid references decision_items(id) on delete set null,
  summary_json jsonb not null,
  computed_at timestamptz not null default now(),
  internal_ranked_json jsonb
);

create table if not exists decision_feedback (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  sentiment smallint not null check (sentiment in (-1, 0, 1)),
  created_at timestamptz not null default now(),
  unique (decision_id, participant_id)
);

create index if not exists idx_decision_feedback_decision_sentiment
  on decision_feedback(decision_id, sentiment);

create table if not exists experience_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null,
  provider_item_id text not null,
  rating smallint not null check (rating between 1 and 5),
  decision_id uuid references decisions(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_experience_ratings_user_created
  on experience_ratings(user_id, created_at desc);

create index if not exists idx_experience_ratings_provider_item
  on experience_ratings(provider, provider_item_id);

create table if not exists events (
  id bigserial primary key,
  event_name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_events_event_name_created_at
  on events(event_name, created_at desc);
