# SUPABASE_RLS_TESTS.md — Row-Level Security Test Checklist

Last updated: May 2026

All tests assume you have two test accounts: **User A** and **User B**.

---

## 1. cases — user can only access own cases

**Setup:**
- Log in as User A, run a check. Note the `case_id` from the response.
- Log in as User B in a separate browser/incognito session.

**Test:** As User B, try to access User A's case:
```
GET /cases/<user_a_case_id>
```
Expected: 404 or redirect to /dashboard (page must not render User A's data).

**SQL verification (Supabase SQL editor, run as authenticated User B):**
```sql
select * from cases where id = '<user_a_case_id>';
-- Expected: 0 rows
```

---

## 2. risk_reports — user can only access own reports

**SQL verification (run as User B):**
```sql
select * from risk_reports where case_id = '<user_a_case_id>';
-- Expected: 0 rows
```

---

## 3. usage_events — user can only read own events, cannot INSERT

**SQL verification (run as User B):**
```sql
-- Read: only own events
select * from usage_events where user_id = '<user_a_user_id>';
-- Expected: 0 rows

-- Write: should be blocked
insert into usage_events (user_id, event_type) values (auth.uid(), 'check_created');
-- Expected: RLS policy error (service role handles inserts)
```

> Note: As of migration 20260516170000, usage_events policy is SELECT-only for authenticated users.
> All inserts are done via the service role in `lib/db/log-usage-event.ts`.

---

## 4. user_billing — user can only read own row, cannot write

**SQL verification (run as authenticated user):**
```sql
-- Read own row: OK
select * from user_billing where user_id = auth.uid();
-- Expected: 1 row

-- Read another user's row: blocked
select * from user_billing where user_id = '<other_user_id>';
-- Expected: 0 rows

-- Write: should be blocked
update user_billing set plan = 'plus' where user_id = auth.uid();
-- Expected: RLS policy error (no update policy exists for users)
```

---

## 5. subscriptions — user can only read own row, cannot write

**SQL verification:**
```sql
-- Read own subscriptions: OK
select * from subscriptions where user_id = auth.uid();

-- Update own plan: blocked (as of migration 20260516170000)
update subscriptions set plan = 'plus' where user_id = auth.uid();
-- Expected: RLS error
```

---

## 6. notification_preferences — user can read, insert, update own row

```sql
-- Read: OK
select * from notification_preferences where user_id = auth.uid();

-- Update: OK
update notification_preferences set weekly_email_enabled = false where user_id = auth.uid();

-- Read another user's: blocked
select * from notification_preferences where user_id = '<other_user_id>';
-- Expected: 0 rows
```

---

## 7. anonymous_checks — no user-facing access

```sql
select * from anonymous_checks;
-- Expected: RLS error (no policy for authenticated or anon roles)
```

---

## 8. legal_versions — public read only

```sql
-- Anyone can read:
select * from legal_versions;
-- Expected: rows returned

-- No user can insert:
insert into legal_versions (document_type, version, effective_date) values ('terms', '2.0.0', now());
-- Expected: RLS error
```

---

## 9. user_legal_acceptances — user can read/insert own, cannot modify

```sql
-- Read own: OK
select * from user_legal_acceptances where user_id = auth.uid();

-- Read other's: blocked
select * from user_legal_acceptances where user_id = '<other_user_id>';
-- Expected: 0 rows

-- No delete:
delete from user_legal_acceptances where user_id = auth.uid();
-- Expected: RLS error (no delete policy)
```

---

## 10. Service role bypass

Service role operations (used by `lib/billing/access.ts`, `lib/db/`) bypass RLS by design.
Verify `SUPABASE_SERVICE_ROLE_KEY` is never used in any `NEXT_PUBLIC_` variable by grepping:

```bash
grep -r "NEXT_PUBLIC_.*SERVICE_ROLE\|NEXT_PUBLIC_.*SECRET" .env.local .env.example
# Expected: no matches
```

Also verify it's never logged:
```bash
grep -r "SERVICE_ROLE_KEY" app/ lib/ components/ --include="*.ts" --include="*.tsx"
# Expected: only lib/billing/access.ts and other server-only files
```
