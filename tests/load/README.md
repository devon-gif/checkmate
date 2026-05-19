# k6 Load Tests — CheckRay

## Prerequisites

Install k6 (native binary, NOT an npm package):

```bash
# macOS
brew install k6

# Linux (Ubuntu/Debian)
sudo apt-get install k6
# Full docs: https://k6.io/docs/getting-started/installation/
```

k6 is not installed via pnpm/npm. The `pnpm run load:*` scripts are aliases
that call `k6` directly — k6 must be in your PATH.

---

## Important: BASE_URL must match your local Next.js port

Next.js dev server defaults to port **3000**, but will increment to **3002**, **3004**,
etc. if lower ports are occupied.

**Always check which port your server started on**, then pass it explicitly:

```bash
# If dev server started on 3000 (default):
BASE_URL=http://localhost:3000 k6 run tests/load/smoke-homepage.js

# If dev server started on 3002:
BASE_URL=http://localhost:3002 k6 run tests/load/smoke-homepage.js
```

The `pnpm run load:*` scripts default to `http://localhost:3000`.
If your server is on a different port, run k6 directly with `BASE_URL=...`.

---

## Start the server

```bash
# Development mode (slower — JIT compilation, no caching):
pnpm run dev

# Production mode (recommended for accurate performance numbers):
pnpm run build && pnpm run start
```

> **Note on p95 thresholds**: The public-routes test uses a p95 < 2000ms threshold,
> set for local dev. In Next.js dev mode, cold responses are slower due to JIT
> compilation and no static optimization. For production performance validation,
> always use `pnpm run build && pnpm run start` before running load tests.

---

## Running the tests

### 1. Smoke — homepage only (1 VU, 30s)

```bash
BASE_URL=http://localhost:3000 k6 run tests/load/smoke-homepage.js
pnpm run load:smoke   # uses localhost:3000
```

### 2. Public routes (5 VU, 60s)

Tests: `/` `/pricing` `/sign-in` `/sign-up` `/terms` `/privacy`
`/disclaimer` `/ai-disclosure` `/acceptable-use` `/contact`

Checks: status not 500, body does not include "Application error",
"client-side exception", or "server-side exception".

```bash
BASE_URL=http://localhost:3000 k6 run tests/load/public-routes.js
pnpm run load:public   # uses localhost:3000
```

### 3. Analyzer fallback (2 VU, 30s) — no OpenAI calls, no login required

Sends `X-CheckRay-Test-Mode: fallback` header. In dev mode this:
- Bypasses the usage/billing gate
- Uses the deterministic fallback analyzer (no OpenAI call)
- Does not require a logged-in user
- Returns `saved: false, save_reason: "test_mode"`
- **Never honoured in production**

```bash
BASE_URL=http://localhost:3000 k6 run tests/load/analyze-fallback.js
pnpm run load:analyze:fallback   # uses localhost:3000
```

Expected 200 response shape:
```json
{
  "saved": false,
  "save_reason": "test_mode",
  "used_fallback": true,
  "report": {
    "risk_score": 85,
    "risk_level": "high",
    "disclaimer": "...",
    ...
  }
}
```

### 4. Spike test (ramp to 50 VU)

```bash
BASE_URL=http://localhost:3000 k6 run tests/load/spike-public-routes.js
```

### 5. Soak test (10 VU, 10 min)

```bash
BASE_URL=http://localhost:3000 k6 run tests/load/soak-public-routes.js
```

---

## Safety rules

1. **Never** run spike/soak tests against production — see `PRODUCTION_LOAD_TESTING_POLICY.md`
2. **Always** use `X-CheckRay-Test-Mode: fallback` when testing the analyzer — avoids OpenAI costs
3. **Never** use real user data in test fixtures
4. **Never** automate sign-up/sign-in flows — Supabase auth rate-limits these aggressively
