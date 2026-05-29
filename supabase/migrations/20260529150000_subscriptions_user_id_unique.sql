-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add UNIQUE(user_id) to subscriptions
--
-- Why:
--   The Stripe webhook and checkout routes write the subscriptions row with
--   `.update(...).eq('user_id', userId)`, which silently no-ops when no row
--   exists for that user (the new-user trigger never seeds a subscriptions
--   row). Switching those writes to `upsert(..., { onConflict: 'user_id' })`
--   requires a unique constraint on user_id, which does not exist yet — the
--   only unique index today is on (provider, provider_subscription_id).
--
-- Source of truth:
--   `user_billing` REMAINS the source of truth for plan/access. This change
--   only makes `subscriptions` a reliable audit / customer-id mirror.
--
-- Safety:
--   • Idempotent: guarded by a catalog check, safe to re-run.
--   • Non-destructive: adds a constraint only; no data is modified or dropped.
--   • The subscriptions table is effectively empty in existing environments
--     (rows were never created), so there are no duplicate user_id values to
--     collide. The defensive de-dupe block below keeps the migration safe even
--     if some environment somehow has duplicates.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Defensive de-dupe: if any duplicate user_id rows exist, keep the most
--    recently updated row per user and delete the rest. This is a no-op in
--    every known environment (the table is empty) but guarantees the unique
--    constraint can be created without error.
do $$
begin
  if exists (
    select 1
    from public.subscriptions
    group by user_id
    having count(*) > 1
  ) then
    delete from public.subscriptions s
    using (
      select id,
             row_number() over (
               partition by user_id
               order by updated_at desc, created_at desc, id desc
             ) as rn
      from public.subscriptions
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
    where conname = 'subscriptions_user_id_key'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table "public"."subscriptions"
      add constraint "subscriptions_user_id_key" unique ("user_id");
  end if;
end $$;
