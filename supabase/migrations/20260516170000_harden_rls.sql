-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: harden RLS on subscriptions and usage_events
--
-- Problem: the initial migration used "for all" policies, meaning authenticated
-- users could INSERT, UPDATE, and DELETE rows in both tables directly from the
-- client. This creates two risks:
--
--   1. A user could UPDATE their own subscriptions row to change their plan
--      to 'active' or change their plan field to 'plus' — bypassing billing.
--
--   2. A user could INSERT fake usage_events (to drain a competitor's quota)
--      or DELETE their own usage_events (to reset their own monthly limit).
--
-- Fix: drop the broad "for all" policies and replace with SELECT-only policies.
-- All INSERT/UPDATE/DELETE operations on these tables are performed server-side
-- using the service role, which bypasses RLS.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── subscriptions ─────────────────────────────────────────────────────────────

-- Drop the broad policy (may be named differently depending on migration order)
drop policy if exists "Allow users to manage own subscriptions" on public.subscriptions;

-- Re-add SELECT only
create policy "users can read own subscriptions"
  on public.subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- ── usage_events ──────────────────────────────────────────────────────────────

drop policy if exists "Allow users to manage own usage events" on public.usage_events;

-- Re-add SELECT only (server writes via service role)
create policy "users can read own usage events"
  on public.usage_events
  for select
  to authenticated
  using (auth.uid() = user_id);
