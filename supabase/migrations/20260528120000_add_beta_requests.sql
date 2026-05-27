-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: public beta access request queue
--
-- Stores submissions from the public /beta form so admins can review and
-- approve/reject them from /admin. The corresponding grant lives in
-- `beta_access` (created in 20260527120000_add_beta_access.sql) — this table
-- only tracks the pending queue and audit trail. Approval is a separate
-- write that hits beta_access via the admin route.
--
-- RLS is enabled with NO authenticated-user policies. The public /api/beta/request
-- route inserts via the service-role key; admin routes read/update via the
-- service-role key. Nothing client-side ever touches this table directly.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "citext";

create table if not exists "public"."beta_requests" (
  "id"          uuid        not null default gen_random_uuid(),
  "name"        text        not null,
  "email"       citext      not null,
  "use_case"    text        not null,
  "note"        text,
  "status"      text        not null default 'pending',
  "reviewed_at" timestamptz,
  "reviewed_by" text,
  "created_at"  timestamptz not null default now(),
  "updated_at"  timestamptz not null default now(),
  constraint "beta_requests_pkey"         primary key ("id"),
  constraint "beta_requests_status_check" check (
    status in ('pending', 'approved', 'rejected')
  )
);

-- Pending queue is the hottest read path — index status+created_at for the
-- admin dashboard's "show me pending newest-first" query.
create index if not exists "beta_requests_status_created_idx"
  on "public"."beta_requests" using btree ("status", "created_at" desc);

-- Email index helps the admin "did this person already request?" lookup.
create index if not exists "beta_requests_email_idx"
  on "public"."beta_requests" using btree ("email");

alter table "public"."beta_requests" enable row level security;

-- No authenticated-user policies. All reads/writes go through admin-gated
-- server routes using the service-role key. The public submission route
-- ALSO uses the service-role key (because RLS would otherwise block an
-- anonymous insert) — admin-gating is therefore enforced in app code, not
-- via row-level policies.

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_beta_requests_updated_at'
      and tgrelid = 'public.beta_requests'::regclass
  ) then
    create trigger set_beta_requests_updated_at
      before update on public.beta_requests
      for each row execute function public.set_updated_at();
  end if;
end $$;

comment on table  "public"."beta_requests" is
  'Public beta access request queue. Approved requests still need a separate beta_access grant.';
comment on column "public"."beta_requests"."status" is
  'pending = awaiting review, approved = beta_access row exists, rejected = decision logged but no access.';
comment on column "public"."beta_requests"."reviewed_by" is
  'Admin email (NOT auth.users.id) — keeps the audit trail readable even if the admin account is later deleted.';
