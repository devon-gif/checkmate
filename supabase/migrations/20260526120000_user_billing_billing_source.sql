-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: user_billing — billing_source + cancel_at_period_end
--
-- Adds two columns the application already writes to but the original
-- 20260516140000 migration did not include:
--
--   billing_source        — null for normal Stripe-driven rows,
--                          'admin_override' for rows written by the
--                          /admin/billing-test panel. Lets us tell at a
--                          glance which prod rows came from admin tools.
--
--   cancel_at_period_end  — mirrored from Stripe by the
--                          customer.subscription.updated webhook so the
--                          dashboard can show "cancels Mon DD". Without
--                          this column the webhook upsert silently
--                          dropped the field (and the admin set-plan
--                          handler errored on the column in upsert).
--
-- All changes use IF NOT EXISTS guards — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

alter table "public"."user_billing"
  add column if not exists "billing_source"       text,
  add column if not exists "cancel_at_period_end" boolean not null default false;

-- Optional documentation: allowed values for billing_source. We keep
-- this open-ended (no CHECK constraint) so future tooling can introduce
-- new source labels without a schema migration.
comment on column "public"."user_billing"."billing_source" is
  'Origin of this row. Null = Stripe webhook / default. ''admin_override'' = written by /admin/billing-test.';

comment on column "public"."user_billing"."cancel_at_period_end" is
  'Mirrors Stripe subscription.cancel_at_period_end so the dashboard can show "cancels DATE".';
