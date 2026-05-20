# Ray Core — TODO

## What exists now (`lib/checkray-core/`)

| File | Contents |
|---|---|
| `types.ts` | `RayReport`, `RayApiResponse`, `RayUsageLimitResponse` interfaces |
| `schema.ts` | Zod schemas: `RayReportSchema`, `RayApiResponseSchema` |
| `risk-levels.ts` | `normalizeRiskScore`, `normalizeRiskLevel`, `formatRiskScore`, labels, colors |
| `safe-wording.ts` | `ANALYSIS_DISCLAIMER`, `EXTENSION_DISCLAIMER`, `ensureDisclaimer` |
| `categories.ts` | `CASE_CATEGORIES`, `CATEGORY_LABELS`, `humanizeCategory` |
| `index.ts` | Barrel export + `validateRayReport`, `validateRayApiResponse` |

## Currently wired into

- `app/api/analyze-case/route.ts` — `ensureDisclaimer`, `normalizeRiskScore`, `normalizeRiskLevel`
- `chrome-extension/popup.tsx` — uses same types (inline, not imported — see Phase 2)

---

## Phase 2 — Consolidate existing code

These files duplicate logic that should move to Ray Core:

| Existing location | Duplicate of | Action |
|---|---|---|
| `lib/checkmate-shared.ts` → `getRiskLevel()` | `normalizeRiskLevel()` in ray core | Deprecate, point to ray core |
| `lib/checkmate-shared.ts` → `ANALYSIS_DISCLAIMER` | `safe-wording.ts` | Remove duplicate, import from ray core |
| `lib/checkmate-shared.ts` → `caseCategories` | `categories.ts` | Consolidate |
| `lib/checkmate-shared.ts` → `humanizeCategory()` | `humanizeCategory()` in ray core | Remove duplicate |
| `components/case-risk-badge.tsx` | Risk level colors/labels | Import from `risk-levels.ts` |

**Do not break existing imports before consolidating. Add deprecation comments first.**

---

## Phase 2 — Validate outgoing API responses

In `app/api/analyze-case/route.ts`, before `NextResponse.json(...)`:

```ts
import { validateRayReport } from '@/lib/checkray-core'

const validated = validateRayReport(report)
if (!validated.success) {
  console.error('[analyze-case] invalid report shape:', validated.error)
  // Still return — do not fail silently and swallow the result
}
```

This will catch any future analyzer output shape regressions before they reach the client.

---

## Phase 2 — Chrome extension uses shared types

Currently the extension has inline type definitions copied from Ray Core.
Once the extension has a build step that can import from the monorepo:

Option A: publish `@checkray/core` as a private npm package.
Option B: use a pnpm workspace symlink (`packages/checkray-core`).
Option C: copy-on-change with a codegen script (simplest for MVP).

Recommended: Option B — add `packages/checkray-core/` to the pnpm workspace.

---

## Phase 3 — Email and SMS workflows

When building email analysis (e.g. Zapier/Make.com webhook or forwarding address):
- Use `RayApiResponseSchema` to validate responses before storing
- Use `EMAIL_DISCLAIMER` from `safe-wording.ts`
- Map to `CaseCategory` using `humanizeCategory()` for display

---

## Phase 3 — Multi-surface disclaimer enforcement

Add a lint rule or CI check that no surface renders a Ray result without the disclaimer.
Suggested: grep CI step that checks for `disclaimer` near any `risk_score` render.

---

## Open questions

1. Should `normalizeRiskLevel()` use the same thresholds as the AI model, or let the model determine its own level? Current: always re-derives from score (consistent but may override a more nuanced model output).
2. Should `validateRayReport` be called on every response and fail loudly in CI? Or warn-only?
3. When should the extension import from `@checkray/core` vs inline types?
