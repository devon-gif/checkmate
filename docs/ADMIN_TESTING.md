# CheckRay Admin Testing

## Required Environment Variables

Set these server-side only:

```bash
ENABLE_ADMIN_TOOLS=true
ADMIN_EMAILS=devonavich0@gmail.com
```

Optional:

```bash
ADMIN_LOGIN_REDIRECT=/admin
```

Do not use `NEXT_PUBLIC_` for admin authorization values.

## Access

Visit `/admin/login` and enter the admin email. CheckRay sends a Supabase
passwordless magic link only when the email is listed in `ADMIN_EMAILS`. The
link returns through `/api/auth/callback` and then lands on `/admin`.

Google OAuth remains available as a secondary option when configured in
Supabase.

Admin access requires all of the following:

- `ENABLE_ADMIN_TOOLS=true`
- an authenticated Supabase user
- the signed-in email listed in `ADMIN_EMAILS`

If `devonavich0@gmail.com` does not have a Supabase password yet, use the
passwordless magic link or Google OAuth flow. Do not create or store an admin
password in code.

## Supabase URL Configuration

Configure Supabase Auth redirect URLs to allow:

- `https://checkray.app/**`
- `https://checkray.app/auth/callback`
- `https://checkray.app/api/auth/callback`
- `http://localhost:3000/**`
- `http://localhost:3000/auth/callback`
- `http://localhost:3000/api/auth/callback`

Admin tools must still be protected server-side. The magic-link form is only a
login method; `/admin`, `/admin/billing-test`, and `/api/admin/*` must continue
to verify `ENABLE_ADMIN_TOOLS=true`, an authenticated Supabase session, and an
email in `ADMIN_EMAILS`.

## Billing Test Dashboard

Open `/admin/billing-test` from the admin dashboard. The tool updates the
signed-in admin user's `user_billing` row, which is the same billing source of
truth used by the dashboard billing display and analyze-case access checks.

Supported test states:

- Free: `plan='free'`, `status='inactive'`
- Basic: `plan='basic'`, `status='active'`
- Plus: `plan='plus'`, `status='active'`
- Family: `plan='family'`, `status='active'`
- Basic Trial: `plan='basic'`, `status='trialing'`
- Plus Trial: `plan='plus'`, `status='trialing'`
- Family Trial: `plan='family'`, `status='trialing'`
- Past Due: preserves the current paid plan when possible, `status='past_due'`
- Canceled: `plan='free'`, `status='inactive'`

Use Reset Usage Count to delete only the current month's `check_created`
usage events for the signed-in admin user. Saved cases and reports are not
deleted.

## Safety

Admin overrides never call Stripe and never cancel, create, or modify a real
Stripe subscription. If the account has Stripe customer or subscription IDs,
the dashboard warns:

> This account has a real Stripe subscription. Admin override changes CheckRay app state only and does not change Stripe billing.

The Supabase service-role key is used only in server route handlers and must
not be exposed client-side.

## Test Checklist

1. Set `ENABLE_ADMIN_TOOLS=true`.
2. Set `ADMIN_EMAILS=devonavich0@gmail.com`.
3. Visit `/admin/login`.
4. Enter `devonavich0@gmail.com` and send the admin sign-in link.
5. Click the magic link and confirm redirect to `/admin`.
6. Open `/admin/billing-test`.
7. Set Free and confirm the dashboard shows Free with `0 / 1`.
8. Set Basic and confirm the dashboard shows Basic with `0 / 10`.
9. Set Plus and confirm the dashboard shows Plus with `0 / 50`.
10. Set Family and confirm the dashboard shows unlimited fair-use.
11. Set Plus Trial and confirm the dashboard shows Plus trial.
12. Set Past Due and confirm the dashboard shows a payment issue.
13. Reset usage and confirm the monthly usage count resets.
14. Confirm a non-admin email is blocked.
15. Set `ENABLE_ADMIN_TOOLS=false` and confirm admin tools are unavailable.

## Disable Admin Tools

Before public launch, or whenever the tools should not be reachable, remove
`ENABLE_ADMIN_TOOLS` or set it to any value other than `true`.
