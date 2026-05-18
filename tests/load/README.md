# k6 Load Tests — CheckRay

## Prerequisites

Install k6 (does not run through npm):

```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6
# or: https://k6.io/docs/getting-started/installation/
```

## Quick-start

Start the local dev/prod server first:

```bash
# In one terminal:
pnpm run dev
# OR for production-mode tests:
pnpm run build && pnpm run start
```

Then in another terminal:

```bash
# Smallest sanity check (1 VU, 30s, homepage only)
k6 run tests/load/smoke-homepage.js

# All public marketing routes (5 VU, 60s)
k6 run tests/load/public-routes.js

# Analyzer endpoint — fallback mode only, no OpenAI calls (2 VU, 30s)
k6 run tests/load/analyze-fallback.js

# Spike test — ramp to 50 VU briefly
k6 run tests/load/spike-public-routes.js

# Soak test — 10 VU for 10 minutes
k6 run tests/load/soak-public-routes.js
```

## Override BASE_URL

All tests read `BASE_URL` from the environment. Default is `http://localhost:3000`.

```bash
# Target a Vercel preview URL
BASE_URL=https://checkray-git-staging-devonarcher.vercel.app k6 run tests/load/smoke-homepage.js
```

## npm scripts (docs — k6 is a native binary, not an npm package)

Equivalent commands exposed in package.json are not possible because k6 is a
native binary. Run the commands above directly. See below for aliases you can
add to your shell profile if desired:

```bash
alias load:smoke="k6 run tests/load/smoke-homepage.js"
alias load:public="k6 run tests/load/public-routes.js"
alias load:analyze="k6 run tests/load/analyze-fallback.js"
alias load:spike="k6 run tests/load/spike-public-routes.js"
alias load:soak="k6 run tests/load/soak-public-routes.js"
```

## Safety rules

1. **Never** run load tests against production by default.
2. **Never** run auth/signup load tests against the live Supabase project.
3. **Never** run `analyze-fallback.js` in OpenAI mode at high VU — use fallback only.
4. Read `PRODUCTION_LOAD_TESTING_POLICY.md` before targeting any live URL.

## Adding CHECKRAY_FORCE_FALLBACK

To prevent OpenAI from being called during load tests, set this env var when
starting the server:

```bash
CHECKRAY_FORCE_FALLBACK=true pnpm run start
```

This is wired in `app/api/analyze-case/route.ts` — when set, the route skips
the AI call and uses the deterministic fallback analyzer only.
