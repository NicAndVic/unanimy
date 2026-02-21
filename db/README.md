# Database schema (MVP)

This folder contains `schema.sql`, an idempotent PostgreSQL schema intended for Supabase.

## Apply in Supabase SQL Editor

1. Open your Supabase project dashboard.
2. Go to **SQL Editor**.
3. Open `db/schema.sql` from this repo and copy the contents.
4. Paste into a new SQL query and run it.
5. Re-running the same file is safe (`create ... if not exists` is used throughout).

## Notes

- The schema enables `pgcrypto` and uses `gen_random_uuid()` for UUID primary keys.
- Row Level Security (RLS) policies are intentionally not included yet.
- `updated_at` fields are app-managed in this MVP (no DB triggers in this version).
