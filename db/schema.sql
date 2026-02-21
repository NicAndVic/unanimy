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

create table if not exists decision_items (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  label text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
