-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: extend core app tables
-- Adds missing columns to cases, risk_reports, usage_events and adds the
-- "email" category to the cases check constraint.
-- Safe to re-run: all changes use IF NOT EXISTS / DO $$ guards.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── cases: add input tracking + source columns ───────────────────────────────
alter table "public"."cases"
  add column if not exists "input_text"  text,
  add column if not exists "input_url"   text,
  add column if not exists "input_type"  text,
  add column if not exists "source"      text not null default 'web';

-- Add "email" to the category check constraint
-- (Drop old constraint and recreate with email added)
do $$
begin
  if exists (
    select 1 from information_schema.check_constraints
    where constraint_name = 'cases_category_check'
  ) then
    alter table "public"."cases" drop constraint "cases_category_check";
  end if;
end $$;

alter table "public"."cases"
  add constraint "cases_category_check"
  check (category in (
    'scam_text',
    'job_scam_or_ghost_job',
    'bill_or_fee',
    'phishing_url',
    'rental_or_marketplace',
    'email',
    'unknown'
  ));

-- ── risk_reports: add category, model_used, user_id ──────────────────────────
alter table "public"."risk_reports"
  add column if not exists "user_id"     uuid references public.users(id) on delete set null,
  add column if not exists "category"    text,
  add column if not exists "model_used"  text;

-- ── usage_events: add case_id + anonymous_id ─────────────────────────────────
alter table "public"."usage_events"
  add column if not exists "case_id"      uuid references public.cases(id) on delete set null,
  add column if not exists "anonymous_id" text;

-- ── Indexes for new FK columns ───────────────────────────────────────────────
create index if not exists risk_reports_user_id_idx    on public.risk_reports  using btree (user_id);
create index if not exists usage_events_case_id_idx    on public.usage_events  using btree (case_id);
