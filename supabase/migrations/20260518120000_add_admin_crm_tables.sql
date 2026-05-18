-- ============================================================
-- Admin / CRM foundation tables
-- ============================================================
-- admin_users  — future role-based access; MVP gate uses ADMIN_EMAILS env var
-- support_tickets — user-submitted support requests
-- support_notes   — internal agent notes per user
-- admin_audit_logs — admin actions for accountability trail
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- admin_users
-- ────────────────────────────────────────────────────────────
create table if not exists public.admin_users (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade unique,
  email        text,
  role         text not null default 'admin',
  created_at   timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- Only accessible via service role (admin app layer)
create policy "admin_users: no public access"
  on public.admin_users
  for all
  using (false)
  with check (false);

-- ────────────────────────────────────────────────────────────
-- support_tickets
-- ────────────────────────────────────────────────────────────
create table if not exists public.support_tickets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  email        text,
  subject      text not null,
  message      text not null,
  status       text not null default 'open'
                 check (status in ('open', 'in_progress', 'resolved', 'closed')),
  category     text not null default 'general'
                 check (category in ('general', 'billing', 'cancellation', 'bug', 'feature', 'other')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.support_tickets enable row level security;

-- Authenticated users can submit tickets
create policy "support_tickets: users insert own"
  on public.support_tickets
  for insert
  with check (auth.uid() = user_id or user_id is null);

-- Users can view their own tickets
create policy "support_tickets: users view own"
  on public.support_tickets
  for select
  using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- support_notes  (internal, admin-only)
-- ────────────────────────────────────────────────────────────
create table if not exists public.support_notes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  admin_user_id  uuid references auth.users(id) on delete set null,
  note           text not null,
  created_at     timestamptz not null default now()
);

alter table public.support_notes enable row level security;

-- Only accessible via service role
create policy "support_notes: no public access"
  on public.support_notes
  for all
  using (false)
  with check (false);

-- ────────────────────────────────────────────────────────────
-- admin_audit_logs
-- ────────────────────────────────────────────────────────────
create table if not exists public.admin_audit_logs (
  id              uuid primary key default gen_random_uuid(),
  admin_user_id   uuid references auth.users(id) on delete set null,
  action          text not null,
  target_user_id  uuid,
  payload         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

alter table public.admin_audit_logs enable row level security;

-- Only accessible via service role
create policy "admin_audit_logs: no public access"
  on public.admin_audit_logs
  for all
  using (false)
  with check (false);

-- ────────────────────────────────────────────────────────────
-- Trigger: keep support_tickets.updated_at fresh
-- ────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists support_tickets_updated_at on public.support_tickets;
create trigger support_tickets_updated_at
  before update on public.support_tickets
  for each row execute procedure public.set_updated_at();
