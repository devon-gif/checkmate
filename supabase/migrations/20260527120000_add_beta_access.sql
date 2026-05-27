-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: admin-managed beta access
--
-- Lets admins grant free beta access by email without touching Stripe.
-- The application reads this table server-side only; no public write policy is
-- created. Service-role admin routes manage grants/revocations.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "citext";

create table if not exists "public"."beta_access" (
  "id"         uuid        not null default gen_random_uuid(),
  "email"      citext      not null,
  "plan"       text        not null,
  "status"     text        not null default 'active',
  "expires_at" timestamptz,
  "notes"      text,
  "created_by" uuid        references auth.users(id) on delete set null,
  "revoked_at" timestamptz,
  "revoked_by" uuid        references auth.users(id) on delete set null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  constraint "beta_access_pkey" primary key ("id"),
  constraint "beta_access_email_key" unique ("email"),
  constraint "beta_access_plan_check" check (
    plan in ('beta_basic', 'beta_plus', 'beta_family')
  ),
  constraint "beta_access_status_check" check (
    status in ('active', 'revoked')
  )
);

create index if not exists "beta_access_status_expires_at_idx"
  on "public"."beta_access" using btree ("status", "expires_at");

alter table "public"."beta_access" enable row level security;

-- No authenticated-user write policy. Reads/writes happen only through
-- server-side admin routes using the service-role key.

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_beta_access_updated_at'
      and tgrelid = 'public.beta_access'::regclass
  ) then
    create trigger set_beta_access_updated_at
      before update on public.beta_access
      for each row execute function public.set_updated_at();
  end if;
end $$;

comment on table "public"."beta_access" is
  'Admin-managed beta access grants by email. Does not touch Stripe billing.';

comment on column "public"."beta_access"."plan" is
  'One of beta_basic, beta_plus, beta_family.';
