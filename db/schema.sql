create extension if not exists pgcrypto;

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete set null,
  title text not null,
  description text,
  decision_type text not null,
  algorithm text not null,
  allow_veto boolean not null default true,
  status text not null default 'draft',
  criteria_json jsonb not null default '{}'::jsonb,
  max_options int not null default 10,
  sort_by text not null default 'rating',
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_decisions_group_created_at
  on decisions(group_id, created_at);

create table if not exists decision_join_codes (
  decision_id uuid primary key references decisions(id) on delete cascade,
  code char(5) not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(code)
);

create index if not exists idx_decision_join_codes_code
  on decision_join_codes(code);

create table if not exists group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid,
  display_name text not null,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  participant_token text not null,
  user_id uuid,
  role text not null default 'participant',
  joined_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists participants_decision_token_uidx
  on participants(decision_id, participant_token);

create unique index if not exists participants_decision_user_uidx
  on participants(decision_id, user_id)
  where user_id is not null;

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
  unique(provider, provider_item_id)
);

create table if not exists decision_items (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  item_id uuid not null references items(id) on delete restrict,
  display_order int not null,
  snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(decision_id, item_id)
);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  decision_item_id uuid not null references decision_items(id) on delete cascade,
  value smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(participant_id, decision_item_id),
  check (value in (-2, -1, 0, 1, 2))
);

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
  winning_item_id uuid references decision_items(id),
  summary_json jsonb not null,
  internal_ranked_json jsonb,
  computed_at timestamptz not null default now()
);

create table if not exists decision_feedback (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  participant_id uuid references participants(id) on delete cascade,
  user_id uuid,
  reaction smallint not null,
  created_at timestamptz not null default now(),
  check ((participant_id is not null) <> (user_id is not null))
);

create unique index if not exists decision_feedback_decision_participant_uidx
  on decision_feedback(decision_id, participant_id)
  where participant_id is not null;

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists experience_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null,
  provider_item_id text not null,
  decision_id uuid references decisions(id) on delete set null,
  rating smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists experience_ratings_with_decision_uidx
  on experience_ratings(user_id, provider, provider_item_id, decision_id)
  where decision_id is not null;

create unique index if not exists experience_ratings_without_decision_uidx
  on experience_ratings(user_id, provider, provider_item_id)
  where decision_id is null;
