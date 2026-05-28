alter table public.cases
  drop constraint if exists cases_risk_level_check;

alter table public.cases
  add constraint cases_risk_level_check
  check (risk_level in ('needs_more_info', 'low', 'medium', 'high', 'very_high'));

alter table public.risk_reports
  drop constraint if exists risk_reports_risk_level_check;

alter table public.risk_reports
  add constraint risk_reports_risk_level_check
  check (risk_level is null or risk_level in ('needs_more_info', 'low', 'medium', 'high', 'very_high'));
