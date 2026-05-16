-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: billing tables
-- • Extends subscriptions with trial_started_at / trial_ends_at columns.
-- • Adds anonymous_checks table for tracking anonymous visitor usage.
-- Safe to re-run: all changes use IF NOT EXISTS / DO $$ guards.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Extend subscriptions with trial date columns ──────────────────────────────
alter table "public"."subscriptions"
  add column if not exists "trial_started_at" timestamptz,
  add column if not exists "trial_ends_at"    timestamptz;

-- ── anonymous_checks ──────────────────────────────────────────────────────────
-- Tracks checks made by anonymous visitors using a browser cookie (cm_anon_id).
-- No user_id — only the opaque anonymous_id string is stored.
-- RLS enabled; only the service role (server-side) can read/write.
create table if not exists "public"."anonymous_checks" (
  "id"           uuid        not null default gen_random_uuid(),
  "anonymous_id" text        not null,
  "created_at"   timestamptz not null default now(),
  constraint "anonymous_checks_pkey" primary key ("id")
);

create index if not exists "anonymous_checks_anon_id_idx"
  on "public"."anonymous_checks" using btree ("anonymous_id");

alter table "public"."anonymous_checks" enable row level security;
-- No user-facing RLS policies: service role bypasses RLS automatically.

-- ── Trigger: keep subscriptions.updated_at fresh ─────────────────────────────
-- set_updated_at() already exists from the initial migration.
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_subscriptions_billing_updated_at'
      and tgrelid = 'public.subscriptions'::regclass
  ) then
    -- The original migration already created set_subscriptions_updated_at,
    -- so this block is intentionally a no-op.
    null;
  end if;
end $$;
