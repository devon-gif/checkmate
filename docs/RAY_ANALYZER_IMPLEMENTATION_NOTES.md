# Ray Analyzer Implementation Notes

Source of truth: `docs/RAY_SCAM_INTELLIGENCE_RUBRIC.md`.

## Analyzer Flow

- Dashboard/new-case checks call `POST /api/analyze-case`.
- `/api/analyze-case` calls `analyzeCase()` in `lib/checkmate.ts`.
- Inbound email calls the same `analyzeCase()` function from `app/api/inbound/email/route.ts`.
- Deterministic fallback output is built in `lib/analysis/fallback.ts`.
- Inbound email replies are formatted in `lib/billing/inbound-reply-email.ts`.
- Saved dashboard/inbound results use `lib/db/save-case.ts` and `lib/db/save-report.ts`, both of which persist the final `analysis` object.

## Final Risk Clamp

`lib/analyzer/risk-floors.ts` evaluates hard red-flag rules after text normalization. The final clamp is applied in two places:

- AI path: `lib/checkmate.ts` applies floors after `generateObject()` and before `finalizeAnalysis()`.
- Fallback path: `lib/analysis/fallback.ts` applies the same floors before returning fallback analysis.

This ensures dashboard responses, saved reports, inbound email replies, and fallback-only test mode all receive the same floored result.

## API Shape Mapping

The response shape remains the existing nested report object. The only risk enum expansion is `needs_more_info`, used when the rubric says evidence is insufficient and Ray should not return Low.

Critical risk continues to map to the API value `very_high`.
