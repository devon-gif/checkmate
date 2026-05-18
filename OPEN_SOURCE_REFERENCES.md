# OPEN_SOURCE_REFERENCES.md

Open-source projects and integrations the CheckRay team can emulate,
reference, or adopt later. This is **documentation only** — nothing in
this file should be installed, cloned into the app, or copy-pasted
without a deliberate follow-up task.

Last updated: May 2026

---

## 1. Chrome Extension

- **[PlasmoHQ/plasmo](https://github.com/PlasmoHQ/plasmo)**
  Modern framework for building browser extensions with React +
  TypeScript. Handles MV3 manifest, content scripts, background
  service workers, message passing, storage, and hot reload.
  *Use for:* the future CheckRay Chrome extension foundation
  (planning only — see "What to use now").

- **[GoogleChrome/chrome-extensions-samples](https://github.com/GoogleChrome/chrome-extensions-samples)**
  Official Google samples covering every Manifest V3 API surface
  (action, scripting, storage, side panel, contextMenus, etc.).
  *Use for:* canonical Manifest V3 / API behaviour reference when
  building or debugging the extension. Do not vendor code; read,
  understand, re-implement.

---

## 2. Ghost Jobs / Job Context

- **[speedyapply/JobSpy](https://github.com/speedyapply/JobSpy)**
  Python library that aggregates job listings from LinkedIn, Indeed,
  Glassdoor, ZipRecruiter, etc.
  *Use only as a reference* for typical job-posting data shape
  (title, company, posted_at, location, salary range, description)
  and the kinds of fields a ghost-job detector might inspect.
  ⚠️ **Do not scrape** LinkedIn / Indeed / Glassdoor / ZipRecruiter at
  scale unless their Terms of Service or official APIs allow it.
  CheckRay's product direction is **user-current-page analysis** plus
  official company careers / ATS lookups — not crawling job boards.

---

## 3. Phishing / Threat Intelligence

- **[Phishing-Database/Phishing.Database](https://github.com/Phishing-Database/Phishing.Database)**
  Daily-updated lists of phishing domains and URLs.
  *Use as reference* for feed format and update cadence if we ever
  bring in a phishing signal. Treat any hit as **one signal among
  many**, never as proof that a site is malicious.

- **[elliotwutingfeng/Inversion-DNSBL-Blocklists](https://github.com/elliotwutingfeng/Inversion-DNSBL-Blocklists)**
  Aggregated DNSBL-style blocklists of malicious URLs/domains.
  *Use as reference* for feed structure, dedup strategies, and
  bloom-filter-friendly distribution formats. Same rule as above:
  one signal, not a verdict.

---

## 4. Security / DevOps

- **[gitleaks/gitleaks](https://github.com/gitleaks/gitleaks)**
  Scans source trees and git history for committed secrets
  (API keys, OAuth tokens, private keys).
  *Use as a pre-deploy step* before pushing to GitHub or deploying
  to Vercel.

  Example commands (do not run as part of CI yet — local check
  first):
  ```bash
  # One-time install (macOS)
  brew install gitleaks

  # Scan the working tree
  gitleaks detect --source . --no-banner

  # Scan staged changes only (good as a pre-commit hook)
  gitleaks protect --staged --no-banner

  # Scan full git history (slow)
  gitleaks detect --source . --log-opts="--all" --no-banner
  ```

---

## 5. UI

- **[shadcn-ui/ui](https://github.com/shadcn-ui/ui)**
  Accessible, copy-in React components built on Radix UI + Tailwind.
  *Use if* the dashboard, forms, or dialogs ever need an a11y
  cleanup. Components are copied into the repo rather than imported
  as a dependency — read the license before pulling a component in.

---

## 6. Email

- **[resend/resend-nextjs-app-router-example](https://github.com/resend/resend-nextjs-app-router-example)**
  Reference Next.js App Router project that sends transactional and
  marketing emails via Resend.
  *Use later* when implementing the Weekly Scam Watch sender
  (see `NOTIFICATIONS_TODO.md`). Do not install the Resend SDK
  yet — the messaging surface is live but the pipeline is not.

---

## 7. Billing

- **[stripe-samples/checkout-single-subscription](https://github.com/stripe-samples/checkout-single-subscription)**
  Minimal end-to-end example of a single-plan Stripe Checkout
  subscription with webhook handling and a billing portal.
  *Use later* as the reference for Basic ($9.99/mo) and Plus
  ($19.99/mo) subscription checkout flows
  (see `BILLING_TODO.md`).

---

## 8. Supabase

- **[supabase/supabase](https://github.com/supabase/supabase)** —
  monorepo containing the platform itself.
- **[supabase/examples-and-templates](https://github.com/supabase/supabase/tree/master/examples)**
  Reference implementations for:
  - Email/password and OAuth auth flows
  - Row-Level Security (RLS) policy patterns
  - `@supabase/auth-helpers-nextjs` server/client/middleware usage
  - Storage uploads
  - Database functions, triggers, and migrations
  *Use for:* sanity-checking our auth + RLS setup against the
  current "blessed" patterns. Many older examples drift quickly —
  always cross-check against the latest README.

---

## Rules for using open source

1. **Check the license** before copying code into CheckRay. Permissive
   licenses (MIT, Apache-2.0, BSD) are fine with attribution. Avoid
   GPL/AGPL for client-side or server-side code in this product
   without explicit review. **SSPL and other source-available
   licenses are off-limits.**
2. **Prefer reference patterns over copy/paste.** Read the project,
   understand the pattern, re-implement in our style. This avoids
   importing bugs, abandoned APIs, or surprise dependencies.
3. **Do not import heavy dependencies without need.** Every new
   transitive dependency is a security and bundle-size cost. Ask:
   could this be ~50 lines of our own code?
4. **Do not scrape sites that disallow scraping.** Respect
   `robots.txt`, ToS, and applicable laws. CheckRay's product
   direction is user-current-page and official-source verification,
   not large-scale crawling.
5. **Do not make hard "fake" or "real" claims** from third-party
   data. A domain appearing in a phishing feed is a *signal*, not
   proof. A job repost appearing in JobSpy data is a *signal*, not
   proof.
6. **Use cautious language** everywhere user-facing copy describes a
   third-party signal:
   - "risk signals", "possible scam", "may indicate", "appears to"
   - "verify through official sources"
   - never "this is a scam", "this is safe", "Ray confirmed"

---

## What to use now

1. **Gitleaks** — install locally and run `gitleaks detect` before
   each push. Add to CI later.
2. **Plasmo** — *planning only*. Read the docs, sketch out the
   manifest, decide on extension architecture (popup vs side panel,
   content script scope, communication with the web app).
3. **Google Chrome samples** — reference while designing the
   extension's permissions surface and message-passing patterns.
4. **Resend docs / example** — *read later* when starting on the
   Weekly Scam Watch sender. Do not install the SDK yet.
5. **Stripe single-subscription sample** — *read later* when wiring
   up Basic / Plus checkout. Do not implement webhooks yet — see
   `BILLING_TODO.md` for the ordered checklist.

---

## What not to use yet

- **Aggressive job-board scraping** (LinkedIn, Indeed, Glassdoor,
  ZipRecruiter, etc.). Out of scope and legally risky.
- **Playwright / Puppeteer crawlers** in production. Heavy, expensive,
  fragile, and easy to misuse. Local one-off scripts only when
  needed for research.
- **Heavy threat-intelligence pipelines** (MISP, OpenCTI, large
  feed-aggregation jobs). One-signal references only — do not build
  an ingestion pipeline for the MVP.
- **SMS / phone channel.** Twilio, MessageBird, etc. are explicitly
  out of scope. Weekly Scam Watch is email-only.
- **Full CRM / admin panel.** Tracked in `ADMIN_CRM_TODO.md` but not
  on the MVP path. Use Supabase Studio for now.
- **Complex Stripe coupons / cancellation save-offer flows.** The
  cancellation discount table exists in `lib/billing/plans.ts` for
  later, but the multi-step save-offer UX is post-MVP.
