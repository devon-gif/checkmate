-- ─────────────────────────────────────────────────────────────────────────────
-- CheckRay backend setup — safe to run against an existing Supabase project
-- (including "Audia" or any project that already has auth.users).
--
-- Paste this entire file into the Supabase SQL Editor and click "Run".
-- Every statement uses IF NOT EXISTS / DO $$ guards — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ── updated_at trigger function ───────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── users ────────────────────────────────────────────────────────────────────
create table if not exists "public"."users" (
    "id"          uuid        not null references auth.users(id) on delete cascade,
    "email"       citext,
    "full_name"   text,
    "avatar_url"  text,
    "created_at"  timestamptz not null default now(),
    "updated_at"  timestamptz not null default now(),
    constraint users_pkey primary key (id)
);

alter table "public"."users" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'users' and policyname = 'Allow users to manage themselves'
  ) then
    create policy "Allow users to manage themselves"
      on public.users for all to authenticated
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end $$;

create or replace trigger set_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ── cases ────────────────────────────────────────────────────────────────────
create table if not exists "public"."cases" (
    "id"          uuid        not null default gen_random_uuid(),
    "user_id"     uuid        not null default auth.uid() references public.users(id) on delete cascade,
    "category"    text        not null default 'unknown',
    "status"      text        not null default 'open',
    "title"       text        not null,
    "risk_level"  text        not null default 'low',
    "risk_score"  integer     not null default 0,
    "created_at"  timestamptz not null default now(),
    "updated_at"  timestamptz not null default now(),
    constraint cases_pkey            primary key (id),
    constraint cases_status_check    check (status in ('open', 'resolved', 'archived')),
    constraint cases_risk_level_check check (risk_level in ('needs_more_info', 'low', 'medium', 'high', 'very_high')),
    constraint cases_risk_score_check check (risk_score >= 0 and risk_score <= 100)
);

-- Add columns introduced in extend_core_tables migration
alter table "public"."cases"
  add column if not exists "input_text"  text,
  add column if not exists "input_url"   text,
  add column if not exists "input_type"  text,
  add column if not exists "source"      text not null default 'web';

-- Recreate category check constraint to include 'email'
do $$
begin
  -- Drop whichever constraint name exists (old or new)
  if exists (
    select 1 from information_schema.check_constraints
    where constraint_schema = 'public'
      and constraint_name = 'cases_category_check'
  ) then
    alter table "public"."cases" drop constraint "cases_category_check";
  end if;
end $$;

alter table "public"."cases"
  add constraint "cases_category_check"
  check (category in (
    'scam_text', 'job_scam_or_ghost_job', 'bill_or_fee',
    'phishing_url', 'rental_or_marketplace', 'email', 'unknown'
  ));

create index if not exists cases_user_id_idx  on public.cases using btree (user_id);
create index if not exists cases_status_idx   on public.cases using btree (status);

alter table "public"."cases" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'cases' and policyname = 'Allow users to manage own cases'
  ) then
    create policy "Allow users to manage own cases"
      on public.cases for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

create or replace trigger set_cases_updated_at
  before update on public.cases
  for each row execute function public.set_updated_at();

-- ── case_messages ─────────────────────────────────────────────────────────────
create table if not exists "public"."case_messages" (
    "id"          uuid        not null default gen_random_uuid(),
    "case_id"     uuid        not null references public.cases(id) on delete cascade,
    "user_id"     uuid        not null default auth.uid() references public.users(id) on delete cascade,
    "sender_role" text        not null default 'user',
    "content"     text        not null,
    "metadata"    jsonb       not null default '{}'::jsonb,
    "created_at"  timestamptz not null default now(),
    "updated_at"  timestamptz not null default now(),
    constraint case_messages_pkey             primary key (id),
    constraint case_messages_id_case_id_key   unique (id, case_id),
    constraint case_messages_sender_role_check check (sender_role in ('user', 'assistant', 'system', 'support'))
);

create index if not exists case_messages_case_id_created_at_idx
  on public.case_messages using btree (case_id, created_at);

alter table "public"."case_messages" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'case_messages'
      and policyname = 'Allow users to manage messages on own cases'
  ) then
    create policy "Allow users to manage messages on own cases"
      on public.case_messages for all to authenticated
      using (
        exists (
          select 1 from public.cases
          where cases.id = case_messages.case_id
            and cases.user_id = auth.uid()
        )
      )
      with check (
        auth.uid() = user_id
        and exists (
          select 1 from public.cases
          where cases.id = case_messages.case_id
            and cases.user_id = auth.uid()
        )
      );
  end if;
end $$;

create or replace trigger set_case_messages_updated_at
  before update on public.case_messages
  for each row execute function public.set_updated_at();

-- ── risk_reports ──────────────────────────────────────────────────────────────
create table if not exists "public"."risk_reports" (
    "id"                   uuid        not null default gen_random_uuid(),
    "case_id"              uuid        not null references public.cases(id) on delete cascade,
    "summary"              text,
    "risk_score"           integer,
    "risk_level"           text,
    "red_flags"            jsonb       not null default '[]'::jsonb,
    "recommended_actions"  jsonb       not null default '[]'::jsonb,
    "safe_reply"           text,
    "disclaimer"           text,
    "sources"              jsonb       not null default '[]'::jsonb,
    "created_at"           timestamptz not null default now(),
    constraint risk_reports_pkey             primary key (id),
    constraint risk_reports_risk_score_check check (risk_score is null or (risk_score >= 0 and risk_score <= 100)),
    constraint risk_reports_risk_level_check check (risk_level is null or risk_level in ('needs_more_info', 'low', 'medium', 'high', 'very_high'))
);

-- Columns added in extend_core_tables migration
alter table "public"."risk_reports"
  add column if not exists "user_id"    uuid references public.users(id) on delete set null,
  add column if not exists "category"   text,
  add column if not exists "model_used" text;

create index if not exists risk_reports_case_id_created_at_idx
  on public.risk_reports using btree (case_id, created_at desc);
create index if not exists risk_reports_user_id_idx
  on public.risk_reports using btree (user_id);

alter table "public"."risk_reports" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'risk_reports'
      and policyname = 'Allow users to manage risk reports on own cases'
  ) then
    create policy "Allow users to manage risk reports on own cases"
      on public.risk_reports for all to authenticated
      using (
        exists (
          select 1 from public.cases
          where cases.id = risk_reports.case_id
            and cases.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.cases
          where cases.id = risk_reports.case_id
            and cases.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- ── usage_events ──────────────────────────────────────────────────────────────
create table if not exists "public"."usage_events" (
    "id"            uuid        not null default gen_random_uuid(),
    "user_id"       uuid        not null default auth.uid() references public.users(id) on delete cascade,
    "event_type"    text        not null,
    "cost_estimate" numeric,
    "created_at"    timestamptz not null default now(),
    constraint usage_events_pkey                  primary key (id),
    constraint usage_events_event_type_check      check (event_type in ('check_created', 'sms_received', 'email_received', 'attachment_uploaded')),
    constraint usage_events_cost_estimate_check   check (cost_estimate is null or cost_estimate >= 0)
);

-- Columns added in extend_core_tables migration
alter table "public"."usage_events"
  add column if not exists "case_id"      uuid references public.cases(id) on delete set null,
  add column if not exists "anonymous_id" text;

create index if not exists usage_events_user_id_created_at_idx
  on public.usage_events using btree (user_id, created_at desc);
create index if not exists usage_events_case_id_idx
  on public.usage_events using btree (case_id);

alter table "public"."usage_events" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'usage_events'
      and policyname = 'Allow users to manage own usage events'
  ) then
    create policy "Allow users to manage own usage events"
      on public.usage_events for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- ── handle_new_auth_user trigger ──────────────────────────────────────────────
-- Auto-creates a public.users row whenever a new auth.users row is inserted.
-- Uses SECURITY DEFINER so it can write to public.users from a trigger context.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email      = excluded.email,
        full_name  = coalesce(excluded.full_name, public.users.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url);
  return new;
end;
$$;

-- Drop and recreate so re-runs don't error
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Backfill any existing auth users who don't have a public.users row yet
insert into public.users (id, email, full_name, avatar_url, created_at, updated_at)
select
  id,
  email,
  raw_user_meta_data ->> 'full_name',
  raw_user_meta_data ->> 'avatar_url',
  created_at,
  updated_at
from auth.users
on conflict (id) do nothing;

-- ── Verification query (run after setup to confirm tables exist) ──────────────
-- select table_name from information_schema.tables
-- where table_schema = 'public'
--   and table_name in ('users','cases','case_messages','risk_reports','usage_events')
-- order by table_name;
