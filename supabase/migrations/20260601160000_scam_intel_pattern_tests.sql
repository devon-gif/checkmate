-- ============================================================
-- Scam Intelligence — pattern testing fields
-- ============================================================
-- Lets an admin attach an example message to a scam_intel pattern and run it
-- through the existing analyzer to verify Ray currently detects it.
--
-- This is verification metadata only. It does NOT affect live analyzer scoring
-- (scoring uses the in-code catalog at lib/analyzer/scam-intel-catalog.ts).
-- A passing test does not promote a pattern into scoring. See docs/SCAM_INTEL.md.
-- ============================================================

alter table public.scam_intel
  add column if not exists example_text text,
  add column if not exists expected_risk_level text,
  add column if not exists expected_category text,
  add column if not exists last_tested_at timestamptz,
  add column if not exists last_test_result jsonb;
