# Database Scale — TODO

## Current State

Supabase (Postgres) with Row Level Security (RLS) enabled.
Tables: `cases`, `risk_reports`, `usage_events`, `support_tickets`,
`admin_audit_logs`, `scam_intel_items`, `user_profiles` (or similar).

---

## 1. Missing Indexes

Add these in a new migration file (`supabase/migrations/YYYYMMDDHHMMSS_perf_indexes.sql`):

```sql
-- Cases: user's case list (most common query)
CREATE INDEX IF NOT EXISTS idx_cases_user_created
  ON cases(user_id, created_at DESC);

-- Risk reports: lookup by case
CREATE INDEX IF NOT EXISTS idx_risk_reports_case_id
  ON risk_reports(case_id);

-- Risk reports: user history
CREATE INDEX IF NOT EXISTS idx_risk_reports_user_created
  ON risk_reports(user_id, created_at DESC);

-- Usage events: user billing / quota check
CREATE INDEX IF NOT EXISTS idx_usage_events_user_created
  ON usage_events(user_id, created_at DESC);

-- Support tickets: user's open tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_created
  ON support_tickets(user_id, created_at DESC);

-- Support tickets: admin queue by status
CREATE INDEX IF NOT EXISTS idx_support_tickets_status_created
  ON support_tickets(status, created_at DESC);

-- Admin audit logs: per-admin history
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_created
  ON admin_audit_logs(admin_user_id, created_at DESC);

-- Scam intel: public feed by category
CREATE INDEX IF NOT EXISTS idx_scam_intel_category_published
  ON scam_intel_items(category, published_at DESC);

-- Scam intel: admin queue by status
CREATE INDEX IF NOT EXISTS idx_scam_intel_status_published
  ON scam_intel_items(status, published_at DESC);
```

---

## 2. Pagination — Required Before Launch

**Never** return unbounded result sets. All list queries must use:

```sql
SELECT * FROM cases
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 20 OFFSET $2;
```

Or use cursor-based pagination (preferred for large tables):
```sql
WHERE user_id = $1 AND created_at < $cursor
ORDER BY created_at DESC
LIMIT 20;
```

**Pages to audit**:
- `app/cases/page.tsx` — user case list
- `app/dashboard/page.tsx` — recent cases / usage summary
- Admin CRM: all list views

---

## 3. RLS Policy Review

Run this query to see all RLS policies:
```sql
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Verify these rules**:
- Users can only SELECT their own rows
- Users cannot UPDATE/DELETE rows they don't own
- Service role (used in API routes) bypasses RLS — validate all `supabaseAdmin` usage
- Admin users use a separate `admin_users` table or role, NOT just a column flag

---

## 4. Avoid Raw User Input in Queries

Always use parameterized queries or the Supabase client `.eq()` / `.filter()` chaining.

❌ Never:
```ts
supabase.rpc('search_cases', { query: `%${userInput}%` })
```

✅ Use:
```ts
supabase.from('cases').select('*').ilike('title', `%${sanitized}%`)
```

---

## 5. Connection Pooling

On Supabase Pro, enable **PgBouncer** connection pooling:
- Supabase Dashboard → Settings → Database → Connection Pooling
- Use the **pooler connection string** in `DATABASE_URL` for serverless functions
- Keeps max connections under Postgres limit (~100 for free tier, ~500 for Pro)

---

## 6. Scale Milestones

| Users | Action |
|---|---|
| 0–500 | Add indexes above, ensure pagination |
| 500–5,000 | Enable connection pooling, review slow query log |
| 5,000–50,000 | Upgrade Supabase plan, add read replica if needed |
| 50,000+ | Evaluate custom Postgres hosting or horizontal read scaling |

---

## 7. Slow Query Monitoring

Enable in Supabase Dashboard:
- Logs → Postgres → filter by duration > 100ms
- Review weekly until P95 query time < 50ms for all list queries
