# Scam Intelligence

How CheckRay stores, reviews, and (eventually) acts on evolving scam
intelligence — and, just as importantly, what is **not** allowed to touch live
risk scoring.

## The three layers

| Layer | What it is | Affects scoring? |
|-------|------------|------------------|
| **In-code catalog** (`lib/analyzer/scam-intel-catalog.ts`) | The production scoring rules. Pure data + a gated matcher used by the analyzer. | **Yes — this is the only hard scoring source.** |
| **`scam_intel` table** | Reviewed, approved patterns. Mirrors the in-code catalog for the admin UI and curation. | **No.** Read by the admin UI only. |
| **`scam_intel_pending` table** | Raw sources, links, and notes pasted by admins (or, in future, ingested by automation) awaiting review. | **No.** Review staging only. |

The golden rule: **only the in-code catalog changes scores.** Editing
`scam_intel`, adding a `scam_intel_pending` source, or promoting a pending row
into `scam_intel` does **not** change any customer's risk result. Scoring only
changes when a human edits `lib/analyzer/scam-intel-catalog.ts` and ships it.

This is deliberate:

- The analyzer works **offline** and adds no per-check DB round-trip.
- Analyzer evals stay **deterministic**.
- An admin (or a future crawler) **cannot silently move risk scores** by editing
  a table.

## Lifecycle of a scam source

```
paste source  ─▶  scam_intel_pending (review_status='pending')
                       │
              admin reviews
                       ├─▶ rejected            (dropped)
                       └─▶ reviewed ─▶ promote ─▶ scam_intel row (reviewed pattern)
                                                      │
                                          human mirrors it into
                                          scam-intel-catalog.ts ─▶ now affects scoring
```

`review_status` values: `pending`, `reviewed`, `rejected`, `promoted`
(`approved` is retained for backward-compat with v1 rows).

### Why promotion does not change scoring
`POST /api/admin/scam-intel/pending/[id]/promote` inserts a row into the
`scam_intel` **table** and marks the pending source `promoted`. That table is
read by the admin UI, **not** by the analyzer. To make a promoted pattern count
toward risk, a developer must add/adjust it in
`lib/analyzer/scam-intel-catalog.ts` (and add an eval). That keeps a human in the
loop and keeps scoring reviewable in code.

## Admin UI

`/admin/scam-intel`
- **Patterns** tab — curated `scam_intel` catalog (create / edit / activate).
- **Sources & review** tab (`/admin/scam-intel/sources`) — paste raw sources,
  review the queue, and promote.

Source intake fields: `source_type` (required: `ftc`, `fbi_ic3`, `cisa`,
`phishtank`, `openphish`, `linkedin`, `reddit`, `user_report`, `other`),
`source_url` (optional), suspected category/severity (optional), and `notes`
(optional). Source type is validated in the API layer so adding new types does
not require a migration.

## API routes (all admin-gated, service-role only)

| Method | Route | Purpose |
|--------|-------|---------|
| GET / POST | `/api/admin/scam-intel/pending` | list / create pending sources |
| PATCH | `/api/admin/scam-intel/pending/[id]` | update status / suspected fields / notes |
| POST | `/api/admin/scam-intel/pending/[id]/promote` | promote into `scam_intel` |
| GET / POST | `/api/admin/scam-intel` | list / create catalog patterns (v1) |
| PATCH | `/api/admin/scam-intel/[id]` | edit / toggle catalog pattern (v1) |

Gating is identical to every other `/api/admin/*` route: `ENABLE_ADMIN_TOOLS=true`
(else 404), authenticated session (else 401), email in `ADMIN_EMAILS` (else 403).
All admin tables (`scam_intel`, `scam_intel_pending`) have a no-public-access RLS
policy and are reached only through the service-role client.

## Pattern testing (verify, don't promote)

Admin-entered patterns are **knowledge records** — storing one does not make Ray
detect it. To check whether Ray *currently* catches a pattern's example, each
pattern on the **Patterns** tab has a **Test** panel:

1. Enter/edit `example_text` for the pattern.
2. Choose `expected_risk_level` (`low | medium | high | very_high |
   needs_more_info`) and optionally `expected_category`.
3. Click **Run test**. The server runs the example through the **existing
   analyzer** (`analyzeCase`, the same pipeline Ray uses live) and returns the
   actual risk level, score, category, summary, and red flags.
4. **Pass/Fail**: pass when the actual risk level matches the expected level
   (and, if set, the category matches too). With no expectation set, the run is
   informational.
5. The result is saved back to the row (`last_tested_at`, `last_test_result`).

`POST /api/admin/scam-intel/[id]/test` is admin-gated and service-role only. The
test is a **read-only probe** of the analyzer:

- No user quota is consumed (no billing/access call).
- No user case or risk_report is created.
- No email, Stripe, billing, or auth is touched.
- `example_text` is never logged — only pattern id, level, score, category, and
  pass/fail.

**Passing a test does NOT promote a pattern into scoring.** It only tells you
whether the current in-code catalog + analyzer already detect the example. If a
test fails and you want Ray to catch it, a developer must add/adjust the rule in
`lib/analyzer/scam-intel-catalog.ts` (with an eval) and ship it.

## Safe logging

`notes` may contain pasted user-report text, so it is **never** written to logs.
DB failures log the Postgres `code` + `message` only — never `details`/`hint`
(which can echo row values) and never the notes body.

## Daily digest (stub — not active)

`GET /api/cron/scam-intel-digest` is a disabled skeleton:

- Returns **404** unless `ENABLE_SCAM_INTEL_CRON=true`.
- If `CRON_SECRET` is set, requires `Authorization: Bearer <CRON_SECRET>`.
- When enabled, returns counts of pending/reviewed/promoted/rejected sources.
- It does **no scraping** and has **no scoring impact**.

### Automation policy (future work)
Any automated ingestion must:

1. Write only to `scam_intel_pending`.
2. **Require admin review** before promotion.
3. Never write to the in-code catalog and never change scoring automatically.

## Migrations

- `20260601141533_add_scam_intel.sql` — v1: `scam_intel` + `scam_intel_pending`,
  RLS, triggers, seed of 10 patterns.
- `20260601150000_scam_intel_v2_sources.sql` — v2: adds `notes` and
  `promoted_scam_intel_id` to `scam_intel_pending` and widens the
  `review_status` check to `pending | reviewed | approved | rejected | promoted`.
- `20260601160000_scam_intel_pattern_tests.sql` — adds `example_text`,
  `expected_risk_level`, `expected_category`, `last_tested_at`, and
  `last_test_result` to `scam_intel` for the admin pattern-testing flow.
