# Database schema (Supabase)

This folder contains `schema.sql` for the core Unanimy data model.

## Apply in Supabase SQL Editor

1. Open your Supabase project.
2. Go to **SQL Editor**.
3. Create a **New query**.
4. Copy all SQL from `db/schema.sql`.
5. Paste it into the editor.
6. Run the query.

## What it creates

The schema creates the following tables and supporting indexes:

- `groups`, `group_members`
- `decisions`
- `decision_join_codes`
- `participants`
- `items`
- `decision_items`
- `votes`
- `google_place_cache`
- `decision_results`
- `decision_feedback`
- `experience_ratings`
- `events`

It also includes unique constraints and indexes for common query patterns like decision lookup, participant completion checks, and vote aggregation.
