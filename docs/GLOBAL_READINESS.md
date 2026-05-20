# CheckRay — Global Readiness

> **Status: Phase 1 — Static country profiles + optional country_code in API**

---

## Core Principle

**CheckRay's scam detection logic is global.** The AI model and fallback signal engine analyse suspicious messages, URLs, and situations regardless of country. What varies by country is the *guidance* given to the user after the analysis:

- Where to report the scam
- Which official verification steps apply
- Which agencies or channels are relevant
- Local terminology (e.g. "cheque" vs "check", "garda" vs "police")

This layer does not provide legal or regulatory certainty. All guidance is informational and uses cautious language:
> "Consider reporting through…" — not "You are required to report this to…"

---

## Supported Regions (Phase 1)

| Code | Region | Default Locale | Currency |
|------|--------|---------------|----------|
| `US` | United States | `en-US` | USD |
| `UK` | United Kingdom | `en-GB` | GBP |
| `CA` | Canada | `en-CA` | CAD |
| `AU` | Australia | `en-AU` | AUD |
| `IE` | Ireland | `en-IE` | EUR |
| `EU_GENERIC` | European Union (generic) | `en-EU` | EUR |

---

## What Was Added

### lib/global/

| File | Purpose |
|------|---------|
| `types.ts` | `SupportedCountryCode`, `CountryScamProfile`, `ReportingOption`, `VerificationGuidance`, `LocalizedRiskGuidance` |
| `countries.ts` | Static profiles: emergency number, fraud reporting agency, guidance copy |
| `reporting-guidance.ts` | Per-country reporting options + per-category × country verification steps |
| `locale.ts` | `getCountryFromRequest()` (detection), `buildLocalizedGuidance()` (assembler) |
| `index.ts` | Barrel export |

### API changes

`POST /api/analyze-case` now accepts an optional `country_code` field:

```json
{
  "input_text": "Your parcel could not be delivered...",
  "country_code": "UK"
}
```

The response `report` now includes an optional `country_context` field:

```json
{
  "report": {
    "risk_score": 72,
    "risk_level": "high",
    "country_context": {
      "country_code": "UK",
      "display_name": "United Kingdom",
      "reporting_options": [...],
      "verification_steps": [...],
      "used_global_defaults": false
    }
  }
}
```

If `country_code` is not supplied, the country is inferred from (in order):
1. User profile `preferred_country` (when implemented)
2. `country_code` in request body
3. `Accept-Language` header (weak hint)
4. Default: `US`

**Breaking change risk: None.** `country_context` is an optional field. Existing consumers that ignore unknown fields are unaffected.

---

## Country Detection

We do **not** use IP geolocation. We do **not** store IP addresses for detection.

Detection is intentionally lightweight and transparent:
- The user can pass `country_code` explicitly
- The browser's `Accept-Language` header is used as a weak hint only
- We default to `US` if no signal is available

---

## What We Do Not Provide

- ❌ Legal advice about local laws
- ❌ Regulatory certainty ("this is illegal under [regulation]")
- ❌ Financial advice
- ❌ Translated UI (deferred — see LOCALIZATION_TODO.md)
- ❌ Auto-IP geolocation

---

## Scam Intelligence Sources (International)

International scam intelligence sources have been documented in `lib/scam-intelligence/sources.ts` under `PLANNED_INTERNATIONAL_SOURCES`. These are **not yet enabled**. No new crawlers are running.

Planned sources (disabled):
- NCSC UK advisories
- Action Fraud UK
- Canadian Anti-Fraud Centre
- Scamwatch Australia / ACSC
- Europol press releases

---

## Related Files

| File | Purpose |
|------|---------|
| `lib/global/` | Country profiles, reporting options, locale helpers |
| `lib/scam-intelligence/sources.ts` | International source plans (disabled) |
| `docs/COUNTRY_GUIDANCE_TODO.md` | Phase breakdown for country guidance work |
| `docs/LOCALIZATION_TODO.md` | i18n and translation roadmap |
| `supabase/sql/call_ray_future_schema.sql` | Call Ray tables (future — includes country/locale fields) |

---

*Last updated: 2026-05-20 — Phase 1 complete.*
