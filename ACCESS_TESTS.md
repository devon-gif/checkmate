# Access & Usage Gating Tests — CheckRay MVP

Manual test checklist. All tests can be run against local dev (`pnpm dev`).

---

## 1. Anonymous first check works

**Setup:** Open a fresh private/incognito window (no `checkray_anonymous_id` cookie).

**Steps:**
1. Go to `/cases/new` (or `/try`)
2. Paste any suspicious text and click "Ask Ray"

**Expected:**
- Analysis runs and result is displayed
- A `checkray_anonymous_id` cookie is set (inspect in DevTools → Application → Cookies)
- Response includes `"access": { "accessStatus": "anonymous_free", "canAnalyze": true }`

---

## 2. Anonymous second check is blocked

**Setup:** Same browser session from Test 1 (keep the `checkray_anonymous_id` cookie).

**Steps:**
1. Go to `/cases/new`
2. **Expected at page load:** Blocked gate is shown immediately — "You've used your free check"
3. Alternatively, attempt `POST /api/analyze-case` directly

**Expected (server pre-check):**
- Page renders the blocked gate with "Create free account" and "Sign in" buttons
- No form is shown

**Expected (API fallback):**
- `POST /api/analyze-case` returns `HTTP 402`:
  ```json
  {
    "error": "usage_limit_reached",
    "message": "You've used your free check. Create a free account to start your 7-day trial.",
    "access": { "accessStatus": "anonymous_used", "canAnalyze": false }
  }
  ```

---

## 3. New user gets a 7-day trial

**Setup:** Create a brand new account via `/sign-up`.

**Steps:**
1. Sign up with a fresh email
2. Go to `/cases/new` and run any check

**Expected:**
- First analysis succeeds
- A row is inserted into `public.user_billing` with:
  - `plan = 'trial'`
  - `status = 'trialing'`
  - `trial_ends_at = now() + 7 days`
- Dashboard billing card shows "Free trial — 7 days left"

**Verify via SQL:**
```sql
select status, trial_started_at, trial_ends_at
from public.user_billing
where user_id = '<your-user-id>';
```

---

## 4. Trial user can run checks

**Setup:** Signed-in user with `status = 'trialing'` and `trial_ends_at` in the future.

**Steps:**
1. Go to `/cases/new`
2. Paste text and submit

**Expected:**
- Analysis runs successfully
- Response includes `"access": { "accessStatus": "trialing", "canAnalyze": true }`
- Case is saved and appears in dashboard

---

## 5. Expired trial user is blocked

**Setup:** Manually expire a user's trial:
```sql
update public.user_billing
set trial_ends_at = now() - interval '1 day'
where user_id = '<your-user-id>';
```

**Steps:**
1. Sign in as that user
2. Go to `/cases/new`

**Expected (server pre-check):**
- Page renders the expired gate: "Your trial has ended"
- "View plans" and "Back to dashboard" buttons are shown
- No form is shown

**Expected (API):**
- `POST /api/analyze-case` returns `HTTP 402`:
  ```json
  {
    "error": "usage_limit_reached",
    "message": "Your free trial has ended. Upgrade to continue using CheckRay.",
    "access": { "accessStatus": "expired", "canAnalyze": false }
  }
  ```

**Also check:**
- `user_billing.status` is updated to `'inactive'` automatically on next access check

---

## 6. Active status allows checks (Basic plan — within limit)

**Setup:** Manually activate a user as Basic:
```sql
update public.user_billing
set status = 'active', plan = 'basic'
where user_id = '<your-user-id>';

-- Ensure usage_events has fewer than 10 check_created rows this month
delete from public.usage_events
where user_id = '<your-user-id>'
  and event_type = 'check_created'
  and created_at >= date_trunc('month', now());
```

**Steps:**
1. Sign in as that user
2. Go to `/cases/new` and run a check

**Expected:**
- Analysis succeeds without any gate
- Response includes `"access": { "accessStatus": "active", "canAnalyze": true, "plan": "basic" }`
- Dashboard billing card shows green dot

---

## 7. Basic plan user hits 10-check monthly cap

**Setup:** Manually set a Basic user to 10 checks this month:
```sql
update public.user_billing
set status = 'active', plan = 'basic'
where user_id = '<your-user-id>';

-- Insert 10 check_created events this month (adjust count as needed)
insert into public.usage_events (user_id, event_type, created_at)
select '<your-user-id>', 'check_created', now()
from generate_series(1, 10);
```

**Steps:**
1. Sign in as that user
2. Go to `/cases/new` and attempt a check

**Expected:**
- `POST /api/analyze-case` returns `HTTP 402`
- Inline blocked UI shown: "You've reached your 10 checks/month limit. Upgrade to Plus for more checks."

---

## 8. Plus plan user has no monthly cap

**Setup:** Manually activate a user as Plus:
```sql
update public.user_billing
set status = 'active', plan = 'plus'
where user_id = '<your-user-id>';

-- Insert 30 check_created events (more than Basic cap)
insert into public.usage_events (user_id, event_type, created_at)
select '<your-user-id>', 'check_created', now()
from generate_series(1, 30);
```

**Steps:**
1. Sign in as that user
2. Go to `/cases/new` and run a check

**Expected:**
- Analysis succeeds — no cap enforced
- Response includes `"access": { "accessStatus": "active", "canAnalyze": true, "plan": "plus" }`

---

## DB Reference

```sql
-- Check all billing rows
select user_id, plan, status, trial_started_at, trial_ends_at
from public.user_billing
order by created_at desc;

-- Check anonymous usage
select anonymous_id, count(*) as checks
from public.anonymous_checks
group by anonymous_id
order by checks desc;

-- Reset anonymous check for re-testing
delete from public.anonymous_checks
where anonymous_id = '<cookie value>';

-- Reset trial for re-testing
update public.user_billing
set status = 'trialing',
    trial_started_at = now(),
    trial_ends_at = now() + interval '7 days'
where user_id = '<your-user-id>';
```

---

## Cookie Reference

| Cookie | Value | Purpose |
|---|---|---|
| `checkray_anonymous_id` | UUID | Identifies anonymous visitor for 1-check limit |
| `cm_legal_ok` | version string | Caches legal acceptance check (5 min) |

---

> Stripe billing tests are in BILLING_TESTS.md once Stripe is configured.
