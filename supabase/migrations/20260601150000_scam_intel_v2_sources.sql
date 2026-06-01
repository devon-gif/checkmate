-- ============================================================
-- Scam Intelligence v2 — source intake + review queue
-- ============================================================
-- Extends scam_intel_pending so admins can paste raw scam sources
-- (links / notes) for later review and promotion into scam_intel.
--
-- This is an admin-only review staging area. NOTHING here affects live
-- analyzer scoring — production scoring uses the in-code catalog
-- (lib/analyzer/scam-intel-catalog.ts). A pending source only influences
-- scoring once an admin explicitly PROMOTES it into scam_intel AND a human
-- mirrors it into the in-code catalog. See docs/SCAM_INTEL.md.
--
-- Column mapping for v2 intake (reusing existing columns):
--   source_url          → source link (optional)
--   source_type         → ftc | fbi_ic3 | cisa | phishtank | openphish |
--                         linkedin | reddit | user_report | other
--                         (validated in the API layer, not by a DB check, so
--                          new source types don't require a migration)
--   notes               → NEW free-text admin notes (may contain user report
--                         text; never logged)
--   category            → suspected_category (optional)
--   severity            → suspected_severity (optional)
--   review_status       → pending | reviewed | rejected | promoted
--                         ('approved' kept for backward-compat with v1 rows)
-- ============================================================

-- Free-text admin notes for a pending source. May contain pasted user-report
-- text, so application code must never console.log this column.
alter table public.scam_intel_pending
  add column if not exists notes text;

-- Track what a promoted source became (audit trail; nullable).
alter table public.scam_intel_pending
  add column if not exists promoted_scam_intel_id uuid
    references public.scam_intel(id) on delete set null;

-- Widen the review_status check to the v2 lifecycle. The original inline
-- constraint is auto-named scam_intel_pending_review_status_check.
alter table public.scam_intel_pending
  drop constraint if exists scam_intel_pending_review_status_check;

alter table public.scam_intel_pending
  add constraint scam_intel_pending_review_status_check
    check (review_status in ('pending', 'reviewed', 'approved', 'rejected', 'promoted'));

-- (RLS no-public-access policy and updated_at trigger already exist from
--  20260601141533_add_scam_intel.sql — service-role access only.)
