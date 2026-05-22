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

## 9. Dependency security

**Rule:** Dependabot is configured to auto-PR patch/minor updates weekly.

**Rule:** Do not add new npm dependencies without checking:
1. Is this package actively maintained?
2. Does it have known CVEs? (`pnpm audit`)
3. Does it significantly increase bundle size?
4. Is there a simpler native alternative?
