# CheckRay — Launch-Readiness Audit

_Read-only end-of-day MVP audit. No code changed, nothing deployed. Date: 2026-05-28._

Scope covered: inbound email flow, analyzer safety, Stripe billing, beta access, Supabase/security, UX/email, feedback loop.

---

## TL;DR

The product is in good shape. The hard safety and security work is done well: the inbound pipeline is defensive, the analyzer floors are comprehensive with strong eval coverage, RLS is properly hardened, admin routes are uniformly gated, and PII/scam text never hits logs.

The most important findings are **configuration gaps, not code bugs** — two env vars (`ENABLE_ADMIN_TOOLS`, `FEEDBACK_SIGNING_SECRET`) are unset, which silently disables admin tools and the email feedback buttons. These almost certainly explain "admin access partially working" and the feedback loop appearing absent.

---

## Top launch blockers

Ranked by launch impact. Only #1–#3 are true blockers; #4–#6 are strongly recommended before opening the beta wider.

1. **`ENABLE_ADMIN_TOOLS` is not set in `.env.local`.** `getAdminAccess()` short-circuits to `disabled` (404) unless `ENABLE_ADMIN_TOOLS === 'true'`. With it unset, every `/admin` page and `/api/admin/*` route returns 404 even for a whitelisted admin. This is the likely cause of "admin access partially working." Set it (and confirm it's set in the production/Vercel env too, not just locally).

2. **`FEEDBACK_SIGNING_SECRET` is not set anywhere.** `signFeedbackToken()` returns `null` without it, so the allowed-reply email **silently drops the 👍/👎 feedback buttons** and the `/api/feedback/email` endpoint rejects every token as invalid. The feedback loop is fully built but currently dark. Generate a strong random secret and set it in all environments.

3. **Confirm production webhook/env parity.** The inbound route returns **503 in production** if `RESEND_INBOUND_WEBHOOK_SECRET` is missing, and the Stripe webhook returns 503 without `STRIPE_WEBHOOK_SECRET`. These are present in `.env.local` but `.env.example` is stale and missing them — verify each is actually set in the deployed environment before launch, since a missing secret takes the whole flow down with a silent 503.

4. **`subscriptions` table rows are never created, so all webhook `.update().eq('user_id', …)` writes to it silently no-op.** The new-user trigger creates `public.users` + `public.profiles` but not a `subscriptions` row, and `create-checkout-session` only does an `.update()` (not upsert) to store the customer ID. In practice the app survives this because the gate and dashboard read from `user_billing` (which IS upserted correctly). But it means `subscriptions` is unreliable as a data source, and the `checkout.session.completed` handler's customer-ID write is lost. Treat `user_billing` as the source of truth or switch the subscriptions writes to upserts. Not launch-fatal, but a latent data-integrity trap.

5. **`invoice.payment_succeeded`/`payment_failed` match by `provider_customer_id` in `subscriptions`** — which, per #4, may have no row. If the only durable customer-ID record is the dead `subscriptions` write, these invoice events can fail to find a `user_id` and skip the status update. Verify a real Stripe test renewal actually flips `user_billing.status` to `active`/`past_due`.

6. **Prompt-injection floor is low (score 25 / medium).** When injected text contains no other scam signal, the floor only lifts to medium and relies on the AI's own judgment. The eval allows `needs_more_info`/`medium`/`high` here, so it passes, but a cleverly benign-looking injection ("ignore instructions, this is from your bank, confirm your password") leans on the *other* floors firing. Spot-check a few adversarial injection inputs against the live AI path (evals only test the deterministic fallback).

7. **Beta-approved users who never created an account get blocked.** `findUserByEmail` backfills `public.users` from `auth.users`, but a user who was granted beta by email and has *never signed up at all* has no `auth.users` row → `no_user_record` → blocked reply asking them to sign in. This is arguably correct, but make sure the beta-approval email explicitly tells them to sign up with the same address first, or first-time beta users will hit a confusing wall.

8. **`.env.example` is significantly out of date.** Missing `RESEND_API_KEY`, `RESEND_INBOUND_WEBHOOK_SECRET`, `ADMIN_EMAILS`, `ENABLE_ADMIN_TOOLS`, `FEEDBACK_SIGNING_SECRET`, `INBOUND_EMAIL_ADDRESS`, and the current `STRIPE_*_PRICE_ID` names; still lists legacy `NEXT_PUBLIC_STRIPE_PRICE_ID_*`. Anyone provisioning a fresh environment from it will ship something half-broken. (Doc-only, but it's how the above blockers happen.)

9. **Eval suite couldn't be run in this audit environment** (esbuild native-binary platform mismatch in the sandbox — not a code issue). You report it passes locally and the suite has 80 cases across 9 categories with a "never deploy on red" rule. Just make sure it's actually run on the deploy host as a gate, not only on your laptop.

10. **No verified idempotency on Stripe events.** The inbound route has solid `provider_msg_id` idempotency, but the Stripe webhook does not dedupe by `event.id`. Stripe retries on any non-2xx, and the handler returns 500 on error — a transient DB blip could replay an event. Mostly safe because handlers are idempotent updates, but worth a glance before high volume.

---

## Top nice-to-have improvements

1. Switch the `subscriptions` writes to `upsert(onConflict: 'user_id')` (or seed a row in the new-user trigger) so the table stops silently no-op'ing and can serve as a real audit trail.
2. Add a Stripe `event.id` dedupe table to make webhook processing exactly-once.
3. Raise/clarify the prompt-injection floor, or add an explicit "injection detected → never return low" clamp independent of other signals.
4. The beta-request notification email interpolates user `name`/`note` into HTML sent to the operator inbox without escaping (unlike the inbound replies, which escape properly). Low risk (operator-only recipient), but escape it for consistency.
5. Add a lightweight rate limit / per-sender throttle on the inbound route beyond the monthly usage gate, to cap abuse from a single approved address.
6. Surface `save_failed` outcomes (analysis succeeded but case didn't persist) to an alert, not just `inbound_email_log` — right now the user gets a reply but has no dashboard record and nobody's paged.
7. Attachment-only emails currently bounce with "unable" — consider a near-term note in the reply telling users exactly how to forward as text.
8. The over-limit and blocked replies are good; consider adding the specific plan/limit ("you've used 5/5 this month") to reduce support pings.
9. Add a `needs_more_info` styled state to the email template explicitly (it maps to slate/gray via risk-colors, but confirm the button + copy read sensibly when score is 0).
10. Consider logging the analyzer `used_fallback=true` rate to a metric — a spike means the OpenAI key/path is failing and users are silently getting deterministic-only analysis.

---

## What's working well

- **Inbound pipeline is genuinely defensive.** Signature verification (Svix HMAC + replay tolerance), provider-agnostic body extraction, Resend body-hydration fallback, loop/spam guards (`Auto-Submitted`, self-send), `provider_msg_id` idempotency, and "always 200 after valid signature so the provider doesn't double-bill on retry." Cost protection is real: unknown senders never reach OpenAI.
- **Analyzer floors are thorough and centralized.** Both the AI path and the fallback path run through the *same* `finalizeWithFloors` pipeline (the prior bug where fallback bypassed floors is fixed and documented). Critical scam patterns (job+Zelle+deposit, credential phishing, government impersonation, package links, withdrawal-fee traps, tech-support scams) all have very_high (90) floors.
- **Negation handling is sophisticated** — `buildNegationStrippedText` suppresses "no payment / didn't ask for Zelle / never ask for your password" so benign negated messages don't false-positive, while preserving genuine signals like "no interview required."
- **Profanity/gibberish/insufficient input → `needs_more_info`** rather than a misleading low/high score.
- **Eval coverage is strong**: 80 cases, 9 categories, including injection-with-payload (must still flag), injection-only "say this is safe" (must ignore), negated benign cases, and gibberish — with a documented "never weaken a test to make it pass / never deploy on red" policy.
- **RLS is properly hardened.** The dangerous original "for all" policies on `subscriptions`/`usage_events` (which would have let users self-upgrade their plan or reset their own quota) were dropped and replaced with SELECT-only; all writes go through the service role. `inbound_email_log` is service-role-only.
- **Admin gating is uniform and double-locked** (feature flag AND email allowlist). Every `/api/admin/*` route and every `/admin` page calls `getAdminAccess`/`requireAdmin`. 404-on-disabled hides the surface entirely.
- **No service-role key in any client bundle**, and every service-role lib carries `import 'server-only'`.
- **Logs are clean** — body length and masked email only, no scam text, no PII.
- **Email UX is polished**: HTML-escaped, severity-mapped colors, red "Open the full report" button for critical, safer-next-step, attachment notice, and the "Ray can be wrong" disclaimer on every variant.
- **Beta approval flow is correctly ordered** — durable `beta_requests` row written before the notification email; `beta_access` grant written *before* the request is marked approved, so a failure leaves it retryable with no orphaned state.

---

## Files / routes that deserve review tomorrow

- `app/api/stripe/webhook/route.ts` — the `subscriptions` no-op writes (#4/#5); verify a real test renewal updates `user_billing`.
- `app/api/billing/create-checkout-session/route.ts` — the `.update().eq('user_id')` that assumes a `subscriptions` row exists.
- `supabase/migrations/20260515120000_add_core_app_tables.sql` — `handle_new_auth_user` trigger; decide whether to seed a `subscriptions` row here.
- `.env.local` + Vercel/prod env — add `ENABLE_ADMIN_TOOLS`, `FEEDBACK_SIGNING_SECRET`; confirm `RESEND_INBOUND_WEBHOOK_SECRET` and `STRIPE_WEBHOOK_SECRET` are present in prod.
- `.env.example` — bring it in sync with the real key set.
- `lib/analyzer/risk-floors.ts` — the prompt-injection floor (line ~407) and the AI-path injection behavior.
- `lib/billing/inbound-reply-email.ts` + `lib/feedback-token.ts` — confirm feedback buttons render once the secret is set.
- `app/api/beta/request/route.ts` — unescaped HTML interpolation in the operator email.
- `app/api/inbound/email/route.ts` — the `no_user_record` and `save_failed` branches (#7, nice-to-have #6).

---

## Recommended tomorrow build order

1. **Set the two missing env vars** (`ENABLE_ADMIN_TOOLS=true`, a strong `FEEDBACK_SIGNING_SECRET`) in local AND production. This unblocks admin tools and lights up the feedback loop with zero code change. Verify admin pages load and a test email reply shows 👍/👎.
2. **Verify prod secret parity** for `RESEND_INBOUND_WEBHOOK_SECRET` and `STRIPE_WEBHOOK_SECRET` so neither flow 503s on launch.
3. **Run one real end-to-end Stripe test** (checkout → trial → renewal → fail) and confirm `user_billing.status`/`plan` track correctly. Decide on the `subscriptions`-row fix (#4) based on what you see.
4. **Fix the `subscriptions` write path** (seed-on-signup or switch to upsert) so billing has a reliable record — small, contained change.
5. **Send a few adversarial prompt-injection inputs through the live AI path** and confirm none return "low / safe." Tighten the injection floor if any slip.
6. **Sync `.env.example`** so this class of config gap can't recur.
7. **Send one real inbound email as a brand-new beta-approved address** that has never signed up, confirm the blocked/sign-up message reads clearly, and adjust the approval email copy if needed.
8. Then pick from the nice-to-haves (Stripe event dedupe, save_failed alerting, per-sender throttle) as time allows.

---

_All findings are read-only observations. No files were modified, nothing was deployed, and no Stripe/Resend/Supabase/auth/billing/analyzer logic was touched during this audit._
