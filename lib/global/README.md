# lib/global — Country-Aware Guidance Layer

> **Coverage: US, UK, CA, AU, IE, EU_GENERIC**
> **Status: Phase 1 — static profiles + optional country_code in API**

This module provides CheckRay's global readiness layer: country-specific
reporting options, localized verification steps, and country detection helpers.

The core scam detection logic is unchanged and remains global. This layer
adds contextual guidance *after* the analysis, based on where the user is.

---

## Files

| File | Purpose |
|------|---------|
| `types.ts` | `SupportedCountryCode`, `CountryScamProfile`, `ReportingOption`, `VerificationGuidance`, `LocalizedRiskGuidance` |
| `countries.ts` | Static country profiles (display name, currency, emergency number, guidance copy) |
| `reporting-guidance.ts` | Reporting options + localized verification steps by category × country |
| `locale.ts` | `getCountryFromRequest()`, `buildLocalizedGuidance()` |
| `index.ts` | Barrel export |

---

## Usage in the Analyzer

```typescript
import { getCountryFromRequest, buildLocalizedGuidance } from "@/lib/global"

// Detect country
const countryCode = getCountryFromRequest({
  userProfileCountry: session?.user?.country ?? null,
  requestBodyCountry: parsed.data.country_code ?? null,
  acceptLanguageHeader: req.headers.get("accept-language"),
})

// Build guidance block
const countryContext = buildLocalizedGuidance(analysis.category, countryCode)

// Add to report response
const report = { ...baseReport, country_context: countryContext }
```

---

## Country Detection Priority

1. User profile `preferred_country` (if implemented)
2. Explicit `country_code` in request body
3. `Accept-Language` header (weak hint)
4. Default: `"US"`

No IP geolocation. No PII storage for detection.

---

## Adding a New Country

1. Add `"NZ"` (or similar) to `SupportedCountryCode` in `types.ts`
2. Add a `CountryScamProfile` entry to `COUNTRY_PROFILES` in `countries.ts`
3. Add `ReportingOption[]` entry to `REPORTING_OPTIONS` in `reporting-guidance.ts`
4. Add `VERIFICATION_STEPS` entries for common categories
5. Update `inferCountryFromLocale()` in `locale.ts` for relevant locale tags

---

## What Is and Isn't Here

✅ Static reporting options (informational, cautious language)
✅ Localized verification steps per category × country
✅ Country detection without IP geolocation
✅ Global safe defaults when no specific guidance exists

❌ Live i18n framework (deferred — see docs/LOCALIZATION_TODO.md)
❌ Translated UI strings (deferred)
❌ Country-specific pricing / billing (deferred)
❌ Auto-detected IP geolocation (intentionally excluded)

---

## Safety Note

All guidance copy must use cautious, informational language:
- ✅ "Consider reporting through…"
- ✅ "Use the official site for your country…"
- ❌ "You must report this to…"
- ❌ "This is illegal under [law]…"

CheckRay does not provide legal, financial, or regulatory advice.

---

*Last updated: 2026-05-20*
