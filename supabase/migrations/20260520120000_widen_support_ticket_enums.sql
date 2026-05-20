-- ============================================================
-- Widen support_tickets status + category check constraints.
--
-- Status: adds 'waiting_on_customer' and 'in_review'; keeps the
-- existing 'open', 'resolved', 'closed'. We drop 'in_progress' from
-- the canonical set but keep it accepted for legacy rows so existing
-- tickets do not violate the constraint after upgrade.
--
-- Category: replaces the old short list with the richer support
-- taxonomy used by the customer-facing /support form and the admin
-- ticket queue. Old values ('general', 'bug', 'feature') are kept
-- accepted so migrating rows do not fail.
--
-- Safe to re-run: drops then recreates each constraint.
-- ============================================================

do $$
begin
  if exists (
    select 1 from information_schema.check_constraints
    where constraint_schema = 'public'
      and constraint_name like 'support_tickets_status_check%'
  ) then
    alter table public.support_tickets
      drop constraint if exists support_tickets_status_check;
  end if;
end $$;

alter table public.support_tickets
  add constraint support_tickets_status_check
  check (status in (
    -- Canonical (CheckRay v1 spec)
    'open',
    'waiting_on_customer',
    'in_review',
    'resolved',
    'closed',
    -- Legacy values kept so historical rows remain valid
    'in_progress'
  ));

do $$
begin
  if exists (
    select 1 from information_schema.check_constraints
    where constraint_schema = 'public'
      and constraint_name like 'support_tickets_category_check%'
  ) then
    alter table public.support_tickets
      drop constraint if exists support_tickets_category_check;
  end if;
end $$;

alter table public.support_tickets
  add constraint support_tickets_category_check
  check (category in (
    -- Canonical (CheckRay v1 spec)
    'billing',
    'cancellation',
    'refund_request',
    'technical_issue',
    'account_access',
    'report_question',
    'suspicious_result_feedback',
    'other',
    -- Legacy values kept so historical rows remain valid
    'general',
    'bug',
    'feature'
  ));
