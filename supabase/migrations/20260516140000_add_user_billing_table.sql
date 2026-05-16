-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: user_billing table
-- Standalone billing/trial table per user.
-- Keeps trial state decoupled from the general-purpose subscriptions table.
-- Safe to re-run: uses IF NOT EXISTS guards throughout.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists "public"."user_billing" (
  "id"                     uuid        not null default gen_random_uuid(),
  "user_id"                uuid        not null references auth.users(id) on delete cascade,
  "plan"                   text        not null default 'trial',
  "status"                 text        not null default 'trialing',
  "trial_started_at"       timestamptz not null default now(),
  "trial_ends_at"          timestamptz not null default (now() + interval '7 days'),
  "stripe_customer_id"     text,
  "stripe_subscription_id" text,
  "current_period_end"     timestamptz,
  "created_at"             timestamptz not null default now(),
  "updated_at"             timestamptz not null default now(),
  constraint "user_billing_pkey"        primary key ("id"),
  constraint "user_billing_user_id_key" unique ("user_id"),
  constraint "user_billing_status_check" check (
    status in ('trialing', 'active', 'past_due', 'canceled', 'inactive')
  )
);

create index if not exists "user_billing_user_id_idx"
  on "public"."user_billing" using btree ("user_id");

alter table "public"."user_billing" enable row level security;

-- Users can read their own billing row (for dashboard display)
create policy "users can read own billing"
  on public.user_billing for select to authenticated
  using (auth.uid() = user_id);

-- Insert/update is done by the service role only; no user-facing write policy.

-- Keep updated_at fresh (set_updated_at() already exists from the init migration)
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_user_billing_updated_at'
      and tgrelid = 'public.user_billing'::regclass
  ) then
    create trigger set_user_billing_updated_at
      before update on public.user_billing
      for each row execute function public.set_updated_at();
  end if;
end $$;
