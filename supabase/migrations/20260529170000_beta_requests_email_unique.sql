-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add UNIQUE(email) to beta_requests
--
-- Why:
--   The public /api/beta/request route switches from .insert to
--   .upsert(..., { onConflict: 'email' }) so that a user who submits the beta
--   form twice updates their existing pending row instead of creating a
--   duplicate (or hitting an error). That upsert needs a unique constraint on
--   `email`, which does not exist yet — the table created in
--   20260528120000_add_beta_requests.sql only has a primary key on `id` and a
--   plain (non-unique) index on `email`.
--
--   `email` is a citext column, so this unique constraint is already
--   case-insensitive — "User@Example.com" and "user@example.com" collide as the
--   same request, which is exactly what we want for dedupe.
--
-- Safety:
--   • Idempotent: guarded by a catalog check, safe to re-run.
--   • Non-destructive: adds a constraint only. The defensive de-dupe below only
--     runs if duplicates already exist (it keeps the most recently updated row
--     per email and removes the rest) so the constraint can be created cleanly.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Defensive de-dupe: if duplicate emails already exist (possible because the
--    old route used plain .insert), keep the most recently updated row per
--    email and delete the rest. No-op when there are no duplicates.
do $$
begin
  if exists (
    select 1
    from public.beta_requests
    group by email
    having count(*) > 1
  ) then
    delete from public.beta_requests s
    using (
      select id,
             row_number() over (
               partition by email
               order by updated_at desc, created_at desc, id desc
             ) as rn
      from public.beta_requests
    ) ranked
    where s.id = ranked.id
      and ranked.rn > 1;
  end if;
end $$;

-- 2. Add the unique constraint only if it does not already exist.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'beta_requests_email_key'
      and conrelid = 'public.beta_requests'::regclass
  ) then
    alter table "public"."beta_requests"
      add constraint "beta_requests_email_key" unique ("email");
  end if;
end $$;
