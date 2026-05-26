# ADMIN_TESTING.md — admin magic-link login & the billing-test panel

This doc covers how to sign in to the CheckRay admin area
(`/admin`, `/admin/billing-test`) using the Supabase magic-link flow,
plus the Supabase project configuration that makes the magic link
actually land you in a signed-in session instead of a blank page.

Related: `docs/ADMIN_BILLING_TEST_MODE.md` (what the billing-test panel
does), `lib/admin/access.ts` (the gate).

## Required environment variables

All admin gates are server-only. **Never use `NEXT_PUBLIC_` for these.**

| Variable | Where | Notes |
|---|---|---|
| `ENABLE_ADMIN_TOOLS` | `.env.local` and Vercel (server scope) | Must be exactly `true`. Anything else disables admin tools and returns 404. |
| `ADMIN_EMAILS` | `.env.local` and Vercel (server scope) | Comma-separated list of admin emails (case-insensitive). Example: `devonavich0@gmail.com,colleague@example.com`. |
| `NEXT_PUBLIC_APP_URL` | `.env.local` and Vercel (Public scope) | `https://checkray.app` in prod, `http://localhost:3000` locally. Used to build the magic-link `emailRedirectTo`. |
| `NEXT_PUBLIC_SITE_URL` | `.env.local` and Vercel (Public scope) | Same value as `NEXT_PUBLIC_APP_URL` — used by metadata/OpenGraph. |
| `NEXT_PUBLIC_SUPABASE_URL` | already set | Standard Supabase URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | already set | Standard Supabase anon key. |

## Required Supabase project setting (one-time, in the dashboard)

This is the most common cause of magic-link "blank page" symptoms.

In the Supabase dashboard for the CheckRay project:

```
Authentication → URL Configuration → Redirect URLs
```

Make sure ALL of these are listed:

```
https://checkray.app/auth/callback
https://www.checkray.app/auth/callback
http://localhost:3000/auth/callback
```

Also set:

```
Site URL: https://checkray.app
```

**If any of those redirect URLs are missing, Supabase will silently
ignore `emailRedirectTo` and fall back to the Site URL.** That is what
caused magic links to land at `/admin/login#access_token=…` (a URL the
project's allowlist allowed, but where no client code knew how to
consume the hash). The fix in the app code is paired with these
project-side allowlist entries.

## Magic-link login flow

1. Visit `https://checkray.app/admin/login`.
2. Enter your admin email and press **Send admin sign-in link**.
3. `POST /api/auth/admin-magic-link` runs:
   - confirms `ENABLE_ADMIN_TOOLS=true`,
   - confirms the email is in `ADMIN_EMAILS`,
   - calls `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: ${NEXT_PUBLIC_APP_URL}/auth/callback?next=/admin } })`.
4. Supabase sends a magic-link email.
5. You click the link. Supabase verifies the token and redirects the
   browser to `https://checkray.app/auth/callback?next=/admin` —
   either with `?code=…` (PKCE flow) or `#access_token=…` (implicit /
   hash flow), depending on the project's auth flow setting.
6. `/auth/callback` is a **Client Component** that:
   - reads `?code` and calls `supabase.auth.exchangeCodeForSession()` for
     the PKCE shape, OR
   - reads the URL hash, calls `supabase.auth.setSession()` (with
     `detectSessionInUrl: true` doing most of the work) for the hash
     shape;
   - then navigates to the safe relative `?next=` path (default
     `/dashboard`).
7. `/admin/layout.tsx` and `/admin/billing-test/page.tsx` both
   re-verify server-side via `requireAdmin()`:
   - `ENABLE_ADMIN_TOOLS=true` must be set,
   - session must exist,
   - `session.user.email` must be in `ADMIN_EMAILS`.

If any of those checks fail, the page returns 404 (disabled or
forbidden) or redirects to `/admin/login` (unauthenticated).

## What changed (and why it was blank before)

### Before

The magic-link route pointed `emailRedirectTo` at `/api/auth/callback`,
a **server-only** route handler. Server routes can read query
parameters but **never** see URL fragments (`#access_token=…`) — the
browser strips them before sending the request. When the project was
configured for the implicit / hash flow, the magic link came back as:

```
.../api/auth/callback?next=/admin#access_token=…
```

The server route saw only `?next=/admin`, redirected to `/admin`
without establishing a session, middleware bounced the
still-unauthenticated browser to `/admin/login?redirectedFrom=/admin`,
and the hash was dropped on the floor. The page rendered the login
form — visually "blank" from the user's perspective.

### After

`emailRedirectTo` now points to **`/auth/callback`** — a Client
Component. The browser runs JavaScript on that page, sees either the
`?code=` query OR the `#access_token=` hash, and finishes the auth
exchange client-side. The session is written to cookies via the
`@supabase/auth-helpers-nextjs` cookie writer, and the next server
render at `/admin` sees the session.

The old `/api/auth/callback` route still exists for any pre-existing
callers that already point to it (it only handles `?code=` and never
did anything with hashes).

## How to test locally

1. Make sure these are in `.env.local`:
   ```
   ENABLE_ADMIN_TOOLS=true
   ADMIN_EMAILS=devonavich0@gmail.com
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```
2. Make sure the Supabase Redirect URLs allowlist includes
   `http://localhost:3000/auth/callback`.
3. `pnpm dev`, then visit `http://localhost:3000/admin/login`.
4. Send yourself a link, open the email, click.
5. You should briefly see "Signing you in…" at `/auth/callback`, then
   land on `/admin` with the admin nav visible.

## How to disable admin tools

Set `ENABLE_ADMIN_TOOLS=false` (or remove it). Effects:

- The admin footer link returns `null` (invisible).
- `/admin`, `/admin/login`, `/admin/billing-test` and the
  `/api/admin/*` routes return 404 / not-found.
- The magic-link route returns `404 admin_tools_unavailable`.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Magic link lands on `…#access_token=…` and stays blank | Supabase project's Redirect URLs allowlist is missing `…/auth/callback`. Add it in the Supabase dashboard, redeploy, retry. |
| `/admin/login` says "Admin tools are not available." | `ENABLE_ADMIN_TOOLS` is not `true` on the server you hit. Set it in Vercel (Production scope) and redeploy. |
| `/admin/login` says "This account is not authorized for admin access." | Your email isn't in `ADMIN_EMAILS`. Add it, redeploy. |
| Magic link email never arrives | Supabase project SMTP is misconfigured. Check Auth → Email Settings. |
| Hash flow works but PKCE doesn't | Check that the Supabase project is on the auth flow you expect. Both shapes work via this code, but mismatched config can mean Supabase sends links in a different shape than you tested. |
