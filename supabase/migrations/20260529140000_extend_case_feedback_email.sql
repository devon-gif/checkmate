-- ============================================================
-- Extend case_feedback for email (token-based, no-auth) feedback
--
-- Changes:
--   1. Make user_id nullable — email feedback has no auth session
--   2. Fix foreign-key reference from auth.users → public.users
--   3. Add source, email, token, ip_hash, user_agent columns
--   4. Replace the unique(case_id, user_id) constraint with two
--      partial unique indexes:
--        a. (case_id, user_id) WHERE user_id IS NOT NULL — dashboard
--        b. (token)            WHERE token  IS NOT NULL — email link
-- ============================================================

-- 1. Drop the old NOT NULL + unique constraint
alter table public.case_feedback
  alter column user_id drop not null;

-- 2. The old FK pointed at auth.users; re-point it at public.users
--    (nullable, ON DELETE SET NULL so rows survive user deletion)
alter table public.case_feedback
  drop constraint if exists case_feedback_user_id_fkey;

alter table public.case_feedback
  add constraint case_feedback_user_id_fkey
    foreign key (user_id)
    references public.users(id)
    on delete set null;

-- 3. New columns
alter table public.case_feedback
  add column if not exists source     text not null default 'dashboard'
    check (source in ('dashboard', 'email', 'sms')),
  add column if not exists email      text,
  add column if not exists token      text,
  add column if not exists ip_hash    text,
  add column if not exists user_agent text;

-- 4a. Drop old unique constraint (if it was created as a constraint)
alter table public.case_feedback
  drop constraint if exists case_feedback_case_id_user_id_key;

-- 4b. Partial unique index for dashboard feedback (one row per user per case)
create unique index if not exists case_feedback_user_case_uidx
  on public.case_feedback (case_id, user_id)
  where user_id is not null;

-- 4c. Partial unique index for email feedback (one row per HMAC token)
create unique index if not exists case_feedback_token_uidx
  on public.case_feedback (token)
  where token is not null;

-- 5. Update insert RLS policy so null user_id is allowed from service role
--    (service role bypasses RLS; anon/authenticated paths use existing policies)
--    No extra policy needed — service role in the email API route does the insert.

-- Helper index for admin queries ordered by created_at
create index if not exists case_feedback_created_at_idx
  on public.case_feedback (created_at desc);
