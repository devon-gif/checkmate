-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: stripe_webhook_events (idempotency ledger)
--
-- Why:
--   Stripe retries webhook deliveries on any non-2xx response, and our
--   handlers can run more than once for the same event.id. The handlers are
--   already idempotent updates, but recording each processed event.id lets us
--   short-circuit duplicates with a 200 and avoid re-running side effects.
--
-- Usage:
--   The webhook route inserts event.id BEFORE processing. A unique-violation
--   on the primary key means we've already seen it → return 200 duplicate.
--
-- Safety:
--   • Idempotent: create table if not exists.
--   • Service-role only: RLS enabled with no policies (server writes bypass RLS).
--   • Non-destructive.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists "public"."stripe_webhook_events" (
  "id"         text        not null,
  "type"       text,
  "created_at" timestamptz not null default now(),
  constraint "stripe_webhook_events_pkey" primary key ("id")
);

alter table "public"."stripe_webhook_events" enable row level security;
-- No user-facing policies: only the service role (server-side) reads/writes.
