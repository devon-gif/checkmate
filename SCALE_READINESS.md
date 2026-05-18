# Scale Readiness — CheckRay

## Target

**250,000 registered customers worldwide** (long-term goal).

> Important distinction: 250K **registered users** is not the same as 250K
> **concurrent users**. A typical SaaS with 250K registered users might see
> 1,000–5,000 concurrent active users at peak. Plan for that, not the full base.

---

## Load Targets by Phase

### Phase 1 — MVP / Early Traction (now → ~10K users)

| Metric | Target |
|---|---|
| Concurrent public visitors | 100 |
| Analyze requests / minute | 20 |
| Analyze requests / day | 1,000 |
| Auth sign-ups / day | 50–200 |
| Dashboard page loads / minute | 30 |

### Phase 2 — Growth (10K–100K users)

| Metric | Target |
|---|---|
| Concurrent public visitors | 1,000 |
| Analyze requests / minute | 500 (with queue / rate limits) |
| Analyze requests / month | 100,000+ |
| Auth sign-ups / day | 500–2,000 |
| Dashboard page loads / minute | 300 |

### Phase 3 — Scale (100K–250K users)

| Metric | Target |
|---|---|
| Concurrent public visitors | 5,000–10,000 |
| Analyze requests / minute | 2,000+ with aggressive caching |
| Analyze requests / month | 1M+ |
| Weekly scam-watch digest emails | 100K+ |

---

## Known Bottlenecks

### 1. OpenAI / AI API cost and latency
- Each AI-backed analysis costs ~$0.001–$0.01 depending on model and input size.
- At 1M requests/month: $1,000–$10,000/month in AI costs alone.
- **Mitigation**: deduplication/caching for identical or similar inputs, fallback
  analyzer for repeated known scam patterns, usage gating before AI call.

### 2. Supabase auth rate limits
- Supabase free tier: 200 concurrent connections, limited email send rate.
- At scale: upgrade to Pro or Team plan, use Supabase Pooler (PgBouncer).
- Do not hammer Supabase auth endpoints during load tests.

### 3. Supabase DB queries
- No indexes on `cases(user_id, created_at)`, `risk_reports(case_id)` yet.
- Full-table scans will degrade at 10K+ rows.
- See `DATABASE_SCALE_TODO.md` for full index plan.

### 4. Vercel serverless function duration/concurrency
- Default function timeout: 10s (Hobby), 60s (Pro).
- OpenAI calls can take 3–8s; close to Hobby timeout under load.
- **Mitigation**: upgrade Vercel plan; switch to streaming responses.

### 5. Weekly crawler / email digest jobs
- Running heavy DB queries or sending 100K emails in one job is not safe.
- **Mitigation**: chunk jobs into batches of 500, use Vercel Cron + queue.

### 6. Dashboard queries
- Loading all cases + reports for a user on one page will degrade.
- **Mitigation**: paginate, add indexes, limit columns fetched.

---

## Required Safeguards (in priority order)

| Safeguard | Status | Priority |
|---|---|---|
| Usage gating before AI call | ✅ Done | P0 |
| Fallback analyzer | ✅ Done | P0 |
| CHECKRAY_FORCE_FALLBACK for load tests | ✅ Done | P0 |
| Supabase RLS on all tables | ✅ Done | P0 |
| Admin audit logs | ✅ Done | P1 |
| Rate limiting (anonymous + signed-in) | ❌ TODO | P1 |
| Deduplication/caching of repeated scam text | ❌ TODO | P1 |
| Supabase DB indexes | ❌ TODO | P1 |
| Sentry error capture | ❌ TODO | P1 |
| Vercel observability / Speed Insights | ❌ TODO | P2 |
| Abuse prevention / CAPTCHA on auth | ❌ TODO | P2 |
| Queue for crawler/email jobs | ❌ TODO | P2 |
| Supabase transaction pooler (PgBouncer) | ❌ TODO | P2 |
| Materialized summary tables for dashboard | ❌ TODO | P3 |

---

## Recommended Next Engineering Priorities

1. **Add DB indexes** (1–2 hours, zero downtime) — biggest performance gain for cheapest effort.
2. **Rate limiting** on `/api/analyze-case` — prevents abuse and cost blowup.
3. **Sentry** — catch production errors before users report them.
4. **Paginate dashboard** — cap case list at 20–50 rows.
5. **Deduplicate repeated scam inputs** — cache fallback results for 24h.
6. **Upgrade Vercel plan** before any meaningful launch traffic.
7. **Enable Supabase Pooler** when direct Postgres connection count approaches limit.
