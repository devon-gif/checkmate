-- CheckRay fresh-project security hardening.
-- Revoke public direct execution of the auth trigger function. PostgreSQL
-- continues to invoke this function through the auth.users trigger.
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;

-- These trigger helpers use only built-in now() and the NEW record.
-- Pin their search_path to prevent untrusted schema object resolution.
alter function public.set_updated_at() set search_path = pg_catalog;
alter function public.set_notification_preferences_updated_at() set search_path = pg_catalog;
alter function public.set_case_feedback_updated_at() set search_path = pg_catalog;

-- The auth trigger explicitly schema-qualifies public.users/public.profiles.
alter function public.handle_new_auth_user() set search_path = pg_catalog;
