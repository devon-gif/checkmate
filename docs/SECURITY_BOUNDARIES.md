# docs/SECURITY_BOUNDARIES.md — Hard Security Rules

These rules are **non-negotiable**. Any code that violates them is a blocker. AI agents must flag violations immediately and refuse to write code that breaks them.

---

## 1. Environment variable boundaries

### Client-safe (allowed in browser bundles)
Only variables prefixed with `NEXT_PUBLIC_` are safe to expose to the client.

| Variable | Client safe? |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes (anon key, RLS enforced) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ Yes |
| `NEXT_PUBLIC_SENTRY_DSN` | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ **Server only. Never in client code.** |
| `OPENAI_API_KEY` | ❌ **Server only. Never in client code.** |
| `STRIPE_SECRET_KEY` | ❌ **Server only. Never in client code.** |
| `STRIPE_WEBHOOK_SECRET` | ❌ **Server only. Never in client code.** |
| `RESEND_API_KEY` | ❌ **Server only. Never in client code.** |
| `ADMIN_EMAILS` | ❌ **Server only. Never in client code.** |

**Rule:** If you add a new secret or service key, it must be server-only by default. If you ever see a server-only key referenced in a component file, Client Component, or any file without `'use server'` / `'server-only'`, treat this as a critical security bug.

---

## 2. Supabase client usage

| Context | Client to use | Why |
|---|---|---|
| Server Components, Route Handlers, Server Actions | `createServerComponentClient` / `createRouteHandlerClient` | Session-aware, RLS enforced |
| Client Components | `createClientComponentClient` | Browser session, RLS enforced |
| Server admin operations (migrations, seeding, admin API) | `createClient(url, serviceRoleKey)` | Bypasses RLS — USE SPARINGLY |

**Rule:** `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS. It must only be used in:
- Database migration scripts
- Admin-only route handlers (with explicit admin auth check before any DB call)
- Seed scripts (dev/test only)

It must **never** appear in:
- Client Components
- Public API routes (no auth check)
- Shared utility files used by both client and server

---

## 3. Row Level Security (RLS)

**Rule:** RLS must be enabled on every table that holds user data.

Every table in the `users`, `cases`, `risk_reports`, `case_messages`, `usage_events`, `subscriptions`, `user_billing`, `user_legal_acceptances`, `notification_preferences` group must have:
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
- At minimum a policy restricting SELECT/INSERT/UPDATE/DELETE to `auth.uid() = user_id`

**Rule:** Never disable RLS on a user-data table as a debugging shortcut.

**Rule:** Any new table added must have RLS policies defined in the migration before being merged.

---

## 4. Authentication and authorization

**Rule:** Every route under `/dashboard`, `/cases`, `/chat`, `/admin`, and `/billing` must verify the user session before serving data.

**Rule:** Admin routes must verify BOTH:
1. Valid session (authenticated user)
2. User email is in `ADMIN_EMAILS` env var (or `profiles.is_admin = true`)

**Rule:** Middleware must not throw on Supabase errors. It must fail open to the sign-in page, never to an unprotected state.

**Rule:** Do not trust `user_id` from request bodies. Always derive `user_id` from the authenticated session (`supabase.auth.getSession()`).

---

## 5. AI output handling

**Rule:** AI output is untrusted input. Treat it like user input.

- Validate AI responses against the expected schema (Zod or equivalent) before using them
- Never interpolate raw AI output into SQL queries
- Never render raw AI output as unsanitized HTML (use markdown renderer)
- Rate limit AI calls per user — do not allow unbounded AI usage

---

## 6. Logging and PII

**Rule:** Never log:
- Full case content (the user's submitted text)
- AI-generated risk reports (may contain PII from the submitted content)
- User email addresses in request logs
- Session tokens or auth codes
- Stripe payment details

**Rule:** Sentry error reports must not include request body payloads by default. Use `beforeSend` to strip sensitive fields.

---

## 7. Public page safety

**Rule:** Every public page (`/`, `/pricing`, `/privacy`, `/terms`, `/share/[id]`) must:
- Load without any private env vars (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, etc.)
- Never import from `lib/checkmate.ts` directly (it's server-only but also pulls in OpenAI)
- Never throw an unhandled error if Supabase is unavailable

---

## 8. Secret scanning

**Rule:** Gitleaks runs on every commit (pre-commit hook) and on every CI run.

**Rule:** If you need to add a test/stub value that looks like a secret in a non-secret context (e.g. CI workflow), use the pattern `placeholder-build-stub # gitleaks:allow`.

**Rule:** Never add a real secret to any file, even temporarily. If you accidentally commit a secret, rotate it immediately and follow `INCIDENT_RESPONSE.md`.

---

## 9. Stripe billing and webhook integrity

**Rule:** The Stripe webhook route (`/api/stripe/webhook` and any future billing webhook) must verify the signature using `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)` before doing any work. If `STRIPE_WEBHOOK_SECRET` is missing or the signature does not verify, the route must return `400` and do nothing else.

**Rule:** Webhook handlers must be **idempotent**. The same `event.id` arriving twice must produce the same final state in `user_billing` / `subscriptions`. Use Stripe's `event.id` (and/or the subscription's `current_period_end` and status) as the dedup signal. Do not double-credit usage on retries.

**Rule:** `user_billing` and `subscriptions` writes from webhooks must use the service-role client (RLS bypass) because there is no user session in a webhook — but the write key must be derived from the Stripe event payload, never from a request body field the caller could spoof.

**Rule:** Never trust a `plan`, `price_id`, `customer_id`, or `user_id` value that came from the client. Resolve the plan from Stripe (`invoice.lines.data[].price.id` or `subscription.items.data[].price.id`) and resolve the `user_id` from the Stripe customer record's metadata that we set at checkout creation time.

**Rule:** Checkout session creation must require an authenticated user and must embed `{ user_id, plan }` in `client_reference_id` and subscription metadata so the webhook can match the Stripe event back to a CheckRay user.

**Rule:** Never log full Stripe event payloads (they include customer email, last4, country). Log only `event.id`, `event.type`, and the derived `user_id`.

---

## 10. Saved reports and cross-tenant isolation

**Rule:** Routes that read a saved case or risk report by ID (`/cases/[id]`, `/api/cases/[id]/...`, `/share/[id]`) must:

- For authenticated routes: filter by **both** `id` and `user_id = auth.uid()` — never trust RLS alone as the only safety net. RLS is the floor, not the only check.
- For public `/share/[id]`: only return cases that have an explicit `is_public = true` (or equivalent share token) flag. A raw `case_id` lookup with no share-flag check is a cross-tenant leak.

**Rule:** Do not add a "lookup case by id" helper that does not also take a `user_id` (or an explicit `{ allowPublic: true }` opt-in). Convenience helpers that drop the tenant filter cause the worst class of bug we can ship.

**Rule:** Follow-up chat (`case_messages`) and any feature that joins on `case_id` must re-verify the case owner — RLS on `case_messages` alone is not enough if the join path can bypass it.

---

## 11. Admin and support privacy

**Rule:** Admin routes (`/admin/*` and `/api/admin/*`) require **both** an authenticated session **and** an explicit admin check against `ADMIN_EMAILS` (or `profiles.is_admin = true`). The check must run server-side before any DB read. Client-side admin gating is UX only and never a security boundary.

**Rule:** Support tickets and `support_tickets.body` content are treated as **PII**. They can contain forwarded scam messages, names, phone numbers, account numbers, and email addresses.
- Do not log ticket bodies.
- Do not include ticket bodies in Sentry breadcrumbs.
- Do not return other users' tickets from any non-admin route.
- Do not include ticket content in URL query parameters or analytics events.

**Rule:** Admin views that list user data (tickets, cases, billing) must paginate and must never expose `auth.users.email` or other Supabase-managed PII to a non-admin user, even transiently in a server-rendered HTML response that could be cached.

**Rule:** When an admin updates a ticket status or notes, the writing user must be recorded (`updated_by = auth.uid()`). This is for audit, not for display to the end user.

---

## 12. OpenAI usage and cost controls

**Rule:** Every code path that calls OpenAI must be **gated by an authenticated rate limit** or the documented anonymous single-check path. There is no "internal debug" endpoint that bypasses the limit.

**Rule:** The 25 checks / 24 h limit in `app/api/analyze-case/route.ts` is a security boundary, not a soft UX limit. Removing or widening it requires an explicit change to this doc and `AGENTS.md`.

**Rule:** Background jobs, scheduled tasks, and admin tools that call OpenAI must have a hard per-run cap and must use the cheapest model that satisfies the task (`CHECKMATE_ANALYZER_MODEL` default = `gpt-4o-mini`).

**Rule:** If an analyzer call fails (timeout, rate limit, 5xx), the deterministic fallback in `lib/checkmate.ts` must run instead of returning an error. Never let an OpenAI outage break the product or the saved-case write path.

---

## 13. Dependency security

**Rule:** Dependabot is configured to auto-PR patch/minor updates weekly.

**Rule:** Do not add new npm dependencies without checking:
1. Is this package actively maintained?
2. Does it have known CVEs? (`pnpm audit`)
3. Does it significantly increase bundle size?
4. Is there a simpler native alternative?
