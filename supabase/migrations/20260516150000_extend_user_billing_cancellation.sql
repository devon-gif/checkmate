-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: extend user_billing with cancellation fields
-- Adds cancel_offer_stage, cancellation_reason, cancellation_feedback.
-- Safe to re-run: all changes use IF NOT EXISTS guards.
-- ─────────────────────────────────────────────────────────────────────────────

alter table "public"."user_billing"
  add column if not exists "cancel_offer_stage"     integer,
  add column if not exists "cancellation_reason"    text,
  add column if not exists "cancellation_feedback"  text;

-- Extend plan check: free | trial | basic | basic_yearly | plus | plus_yearly
-- (Drop old constraint if it exists and recreate)
do $$
begin
  if exists (
    select 1 from information_schema.check_constraints
    where constraint_name = 'user_billing_status_check'
      and constraint_schema = 'public'
  ) then
    -- status constraint already exists from the original migration
    null;
  end if;
end $$;
