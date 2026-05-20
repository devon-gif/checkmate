# Country Guidance — TODO

> Tracks planned improvements to CheckRay's country-specific scam guidance.

---

## Phase 1 — Static Profiles (Complete)

- [x] Define `SupportedCountryCode` and related types in `lib/global/types.ts`
- [x] Static country profiles: US, UK, CA, AU, IE, EU_GENERIC
- [x] Per-country reporting options (FTC, Action Fraud, CAFC, Scamwatch, Garda, EU)
- [x] Per-category × per-country localized verification steps
- [x] Optional `country_code` field in `/api/analyze-case` request
- [x] `country_context` optional field in API response
- [x] Country detection: user profile > request body > Accept-Language > default US
- [x] Documented planned international scam intel sources (disabled)
- [x] Analyzer tests: G1 UK phishing, G2 US job scam, G3 EU invoice scam

---

## Phase 2 — User Country Preference

- [ ] Add `preferred_country` field to the user profile / settings
- [ ] Update `getCountryFromRequest()` to read from authenticated user profile
- [ ] Add country selector to user settings page (if settings page exists)
- [ ] Pass `preferred_country` through to `buildLocalizedGuidance()`
- [ ] Add `preferred_country` migration to users table:
  ```sql
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS preferred_country text;
  ```
- [ ] Validate `preferred_country` against `SupportedCountryCode` on save

---

## Phase 2 — Localized Content

- [ ] Country-specific homepage copy (e.g. "Used by Australians to spot scams")
- [ ] Country-specific weekly scam watch digest (feeds per region)
- [ ] Local currency display (CAD, AUD, GBP) in example amounts
- [ ] Enable NCSC UK advisory feed (`lib/scam-intelligence/sources.ts`)
- [ ] Enable Scamwatch AU / ACSC feed
- [ ] Enable CAFC Canada feed
- [ ] Validate each feed's ToS and robots.txt before enabling

---

## Phase 3 — Full Internationalisation

- [ ] Partner with translators for en-GB, en-AU, en-CA, en-IE copy review
- [ ] Introduce i18n framework (e.g. `next-intl` or `react-i18next`) if justified by user base
- [ ] Localized error messages and UI strings
- [ ] Country-specific scam category labels (e.g. "Council Tax scam" for UK)
- [ ] Regional compliance review: GDPR (EU/IE), PIPEDA (CA), Privacy Act (AU)
- [ ] Europol feed integration (EU_GENERIC region)
- [ ] Consider New Zealand (`NZ`), Singapore (`SG`), South Africa (`ZA`)

---

## Countries to Add in Phase 2+

| Code | Country | Priority | Notes |
|------|---------|----------|-------|
| `NZ` | New Zealand | Medium | Similar to AU; share some resources |
| `ZA` | South Africa | Medium | Growing scam problem; large English-speaking user base |
| `SG` | Singapore | Low | High-income, tech-savvy; SPF ScamShield programme |
| `IN` | India | Low | Very large market; English prevalent; OTP/SIM swap scams |
| `FR` | France | Low | French-language UI would be needed; Cybermalveillance.gouv.fr |
| `DE` | Germany | Low | German-language UI needed; Bundeskriminalamt |

---

## Known Gaps in Phase 1

| Gap | Severity | Plan |
|-----|----------|------|
| G3 (EU invoice scam) scores low on fallback engine | Low | Fallback is a known limitation; AI model handles correctly. Add invoice-specific signals in future fallback update. |
| UK `.click` TLD scores medium, not high | Low | Signal weights tuned for US norms. Adjust TLD penalties for international cases in Phase 2. |
| No user-facing country selector UI | Medium | Deferred to Phase 2 settings page. |
| `EU_GENERIC` is a catch-all, not per-country | Medium | Add per-country EU profiles (FR, DE, NL, etc.) in Phase 3. |
| No French/German/Spanish content | Low | Deferred to Phase 3. English-only for now. |

---

*Last updated: 2026-05-20*
