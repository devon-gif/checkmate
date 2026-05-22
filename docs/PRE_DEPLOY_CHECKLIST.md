# docs/PRE_DEPLOY_CHECKLIST.md — Before Any Production Deploy

Complete every item on this list before pushing to production. No exceptions.

---

## 1. Environment variables (Vercel → Production)

Verify all of these are set in the **Production** environment on Vercel:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `OPENAI_API_KEY`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] `RESEND_API_KEY` (if email notifications enabled)
- [ ] `ADMIN_EMAILS` (comma-separated list of admin email addresses)
- [ ] `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` (if Sentry enabled)

**Note:** `NEXT_PUBLIC_*` vars require a new build to take effect. If you changed a public var, trigger a new build after setting it.

---

## 2. Database migrations

- [ ] All new migration files have been applied to the **Production** Supabase project
- [ ] Migrations have been tested on a preview/staging database first
- [ ] No migration drops a column or table that is still referenced in code
- [ ] All new tables have RLS enabled and correct policies (see [SECURITY_BOUNDARIES.md](SECURITY_BOUNDARIES.md))

---

## 3. CI checks

Run locally and confirm all pass:

```bash
pnpm type-check
pnpm build
gitleaks detect
k6 run tests/load/public-routes.js
k6 run tests/load/analyze-fallback.js
pnpm exec playwright test
```

- [ ] `pnpm type-check` — zero errors
- [ ] `pnpm build` — clean build
- [ ] Gitleaks — no secrets detected
- [ ] k6 public routes — all checks pass (≥1,500/1,500)
- [ ] k6 analyzer fallback — all checks pass (≥580/580)
- [ ] Playwright smoke — all specs pass

---

## 4. Code review

- [ ] Change has been reviewed using the Reviewer prompt in [AI_REVIEW_WORKFLOW.md](AI_REVIEW_WORKFLOW.md)
- [ ] No RED items from the Reviewer
- [ ] [CHANGE_REVIEW_CHECKLIST.md](CHANGE_REVIEW_CHECKLIST.md) completed

---

## 5. Manual smoke test (local or preview)

Run through these flows in the browser before promoting to production:

- [ ] `GET /` — homepage loads, no console errors
- [ ] `GET /pricing` — pricing page loads, plans visible
- [ ] `GET /sign-up` — sign-up form loads
- [ ] `GET /sign-in` — sign-in form loads
- [ ] **Sign up as a new test user** — confirm redirect to `/dashboard`
- [ ] **Submit a test case** — confirm analyzer returns a result with risk score, red flags, recommended actions
- [ ] **View case detail** — confirm saved report renders at `/cases/[id]`
- [ ] **Dashboard** — confirm recent checks list visible
- [ ] `GET /share/[id]` — confirm shareable report loads without auth
- [ ] **Admin gating** — confirm `/admin` returns 403/redirect for non-admin user
- [ ] No unexpected console errors in any of the above flows

---

## 6. Stripe (if billing changes were deployed)

- [ ] Test Stripe webhook with Stripe CLI: `stripe trigger checkout.session.completed`
- [ ] Confirm `user_billing` row updates correctly after webhook fires
- [ ] Confirm billing portal link works for an existing customer

---

## 7. Post-deploy verification (within 15 minutes of deploy)

After promoting to production:

- [ ] Load the production homepage — no error page
- [ ] Check Vercel Runtime Logs for unexpected 500s
- [ ] Check Sentry for new error clusters (if Sentry configured)
- [ ] Submit one test case through the live analyzer — confirm result
- [ ] Check Supabase dashboard — no unusual query errors or RLS violations

---

## 8. Rollback plan

Know how to roll back before you deploy:

- [ ] **Vercel:** Previous deployment is one click to promote in Vercel dashboard
- [ ] **Database:** If a migration was applied and needs reverting, have the rollback SQL ready
- [ ] **Stripe:** Webhook signature key changes require updating both Stripe dashboard and Vercel env vars

---

## Deploy command (Vercel CLI)

```bash
# Preview deploy (automatic on push)
git push origin main

# Production promote (manual — do not auto-promote)
vercel --prod
# or promote from Vercel dashboard: Deployments → select preview → Promote to Production
```

**Never use `vercel --prod` from a dirty working directory or without completing this checklist.**
