# Localisation — TODO

> Tracks CheckRay's path to supporting multiple locales and languages.
> Current state: English-only. US-default with country-aware guidance.

---

## Current State

- **UI language:** English (en-US) only
- **Country-aware guidance:** US, UK, CA, AU, IE, EU_GENERIC (Phase 1)
- **i18n framework:** None installed
- **Currency:** USD displayed in UI; country profiles include local currency code for future use
- **Date/number format:** US defaults

---

## Target Locales (by priority)

| Locale | Language | Region | Priority | Status |
|--------|----------|--------|----------|--------|
| `en-US` | English | United States | ✅ Live | Default |
| `en-GB` | English | United Kingdom | High | Content review needed |
| `en-CA` | English | Canada | High | Minimal changes from en-US |
| `en-AU` | English | Australia | High | Minimal changes from en-US |
| `en-IE` | English | Ireland | Medium | Minimal changes from en-GB |
| `fr-CA` | French | Canada | Medium | Full translation needed |
| `fr-FR` | French | France | Low | Full translation needed |
| `de-DE` | German | Germany | Low | Full translation needed |
| `es-ES` | Spanish | Spain | Low | Full translation needed |
| `es-MX` | Spanish | Mexico | Low | Full translation needed |

---

## English Variant Notes (en-GB / en-AU / en-CA / en-IE)

Before building a full i18n framework, these variants only need:

- Spelling: "colour" vs "color", "analyse" vs "analyze", "cheque" vs "check"
- Terminology: "garda" vs "police", "HMRC" vs "IRS", "Scamwatch" vs "FTC"
- Currency symbol and formatting: "£1,200" vs "$1,200"
- Phone number format: international E.164 display
- Reporting agency names and URLs

The country-aware guidance layer (`lib/global/`) already handles agency names and reporting URLs. The remaining en-* variants are low-impact copy changes.

---

## Avoid Hard-Coded US-Only Phrases

The following patterns should be audited and replaced with locale-aware alternatives:

| Hard-coded phrase | Problem | Fix |
|-------------------|---------|-----|
| "Call 911" | US-only emergency number | Use `countryProfile.emergency_number` |
| "Report to the FTC" | US-only | Use `countryProfile.fraud_reporting_label` |
| "IRS" | US tax agency | Localise to HMRC (UK), CRA (CA), ATO (AU) |
| "$" currency symbol | US-only | Use `Intl.NumberFormat` with locale |
| "zip code" | US-only | Use "postcode" for UK/AU/IE |
| "Social Security Number" | US-only | Localise to NI number (UK), SIN (CA), TFN (AU) |
| "gift cards" | OK globally | Keep — scam pattern is universal |

---

## Currency Formatting

When displaying example amounts:

```typescript
// ✅ Locale-aware
new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)

// ❌ Hard-coded
`$${amount}`
```

Country profiles in `lib/global/countries.ts` include `currency` (ISO 4217) and `default_locale` (BCP-47) for this purpose.

---

## i18n Framework Recommendation (When Ready)

Do not add an i18n framework until:
- At least 2 non-English locales are ready for production
- The app has confirmed non-US/UK user traffic justifying the investment

When ready, evaluate:

| Framework | Notes |
|-----------|-------|
| `next-intl` | Built for Next.js App Router; good TypeScript support |
| `react-i18next` | Widely used; more setup; works with both Pages and App Router |
| ICU message format | Handles plurals, gender, number formatting correctly |

**Do not add these to package.json yet.**

---

## Phase Checklist

### Phase 1 (Done)
- [x] Country-aware reporting guidance (lib/global/)
- [x] Localized verification steps by category × country
- [x] Country detection without IP geolocation

### Phase 2
- [ ] Audit all hard-coded US-only phrases in UI components
- [ ] Replace emergency number, currency symbol, agency name hard-codes
- [ ] en-GB spell/terminology pass on guidance copy
- [ ] User `preferred_locale` field (alongside `preferred_country`)
- [ ] `Intl.NumberFormat` for currency display where needed

### Phase 3
- [ ] fr-CA (French Canadian) translation — highest non-English priority for CA market
- [ ] Full i18n framework integration (next-intl recommended)
- [ ] Locale-aware date formatting throughout app
- [ ] RTL layout support (if Arabic/Hebrew locales added)
- [ ] Translation workflow documentation

---

*Last updated: 2026-05-20*
