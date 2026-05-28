-- ============================================================
-- Case feedback table
-- Users can rate Ray's results and flag inaccuracies.
-- Admins review feedback to improve evals and rule updates.
-- ============================================================

create table if not exists public.case_feedback (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid not null references public.cases(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  -- 'accurate' | 'not_right'
  rating       text not null check (rating in ('accurate', 'not_right')),
  -- reason only populated when rating = 'not_right'
  reason       text check (
    reason is null or reason in (
      'too_risky',
      'not_risky_enough',
      'missed_red_flag',
      'wrong_category',
      'confusing_explanation',
      'other'
    )
  ),
  note         text,
  -- admin review fields
  admin_status text check (
    admin_status is null or admin_status in (
      'reviewed',
      'false_positive',
      'false_negative',
      'needs_rule_update',
      'needs_prompt_update'
    )
  ),
  admin_notes  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- one feedback row per user per case (upsert on conflict)
  unique (case_id, user_id)
);

alter table public.case_feedback enable row level security;

-- Users can submit feedback only for their own cases
create policy "case_feedback: users insert own cases"
  on public.case_feedback
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.cases
      where cases.id = case_feedback.case_id
        and cases.user_id = auth.uid()
    )
  );

-- Users can read their own feedback rows
create policy "case_feedback: users read own"
  on public.case_feedback
  for select
  using (auth.uid() = user_id);

-- Users can update only the user-facing fields on their own rows
create policy "case_feedback: users update own"
  on public.case_feedback
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Admin reads/updates go via service role (no RLS policy needed — service role bypasses RLS)
-- No public SELECT ALL policy — admins access via service role client only.

-- Auto-update updated_at
create or replace function public.set_case_feedback_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger case_feedback_updated_at
before update on public.case_feedback
for each row execute function public.set_case_feedback_updated_at();
