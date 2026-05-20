/**
 * lib/global/types.ts
 *
 * TypeScript types for CheckRay's global/country-aware guidance layer.
 *
 * These types are used by:
 *   - lib/global/countries.ts   — country profiles
 *   - lib/global/reporting-guidance.ts — reporting options per country+category
 *   - lib/global/locale.ts       — detection and lookup helpers
 *   - app/api/analyze-case       — optional country context in responses
 *
 * Country coverage: US, UK, CA, AU, IE, EU_GENERIC
 * See docs/GLOBAL_READINESS.md for the full plan.
 */

// ---------------------------------------------------------------------------
// Country codes
// ---------------------------------------------------------------------------

/** Supported country codes for country-aware guidance. */
export type SupportedCountryCode =
  | "US"
  | "UK"
  | "CA"
  | "AU"
  | "IE"
  | "EU_GENERIC"

// ---------------------------------------------------------------------------
// Country profile
// ---------------------------------------------------------------------------

/**
 * Static profile for a supported country.
 * Used to drive reporting guidance, verification copy, and locale selection.
 */
export interface CountryScamProfile {
  /** ISO 3166-1 alpha-2 code (or a logical group like EU_GENERIC). */
  country_code: SupportedCountryCode
  /** Human-readable name for display (e.g. "United Kingdom"). */
  display_name: string
  /** BCP-47 locale tag (e.g. "en-GB"). */
  default_locale: string
  /** ISO 4217 currency code (e.g. "GBP"). */
  currency: string
  /** Primary emergency services number (e.g. "999"). */
  emergency_number: string

  // ── Guidance copy — informational only, NOT legal advice ──────────────
  /** Short label for the primary fraud reporting channel (e.g. "Action Fraud"). */
  fraud_reporting_label: string
  /** Hint for reporting suspicious texts (usually carrier-level). */
  scam_text_reporting_hint: string
  /** Hint for consumer protection route. */
  consumer_protection_hint: string
  /** Hint for law enforcement / national cybercrime reporting. */
  law_enforcement_hint: string
  /** Short privacy/disclaimer note relevant to this country. */
  privacy_note: string
}

// ---------------------------------------------------------------------------
// Reporting option
// ---------------------------------------------------------------------------

/**
 * A single reporting option shown to the user after an analysis.
 * Each option is cautious and informational — never prescriptive.
 */
export interface ReportingOption {
  /** Short action label (e.g. "Report to FTC"). */
  label: string
  /** One or two sentence explanation. Uses cautious language. */
  detail: string
  /** Country this option applies to. */
  country_code: SupportedCountryCode
  /**
   * Optional URL to the official reporting page.
   * Always the *official* government/carrier URL, never a redirect.
   */
  url?: string
}

// ---------------------------------------------------------------------------
// Verification guidance
// ---------------------------------------------------------------------------

/**
 * Localized verification steps for a specific case category and country.
 * Each step is a short instruction string.
 */
export interface VerificationGuidance {
  country_code: SupportedCountryCode
  /** Case category these steps apply to. */
  category: string
  /** Ordered list of verification steps. */
  steps: string[]
}

// ---------------------------------------------------------------------------
// Localized risk guidance (assembled result)
// ---------------------------------------------------------------------------

/**
 * The assembled country-context block added to an analyze-case response.
 * All fields are optional so existing consumers are not broken.
 */
export interface LocalizedRiskGuidance {
  /** The country code used to generate this guidance. */
  country_code: SupportedCountryCode
  /** Country display name (e.g. "United Kingdom"). */
  display_name: string
  /** Localized reporting options for this category + country. */
  reporting_options: ReportingOption[]
  /** Localized verification steps for this category + country. */
  verification_steps: string[]
  /** Whether this guidance fell back to global safe defaults. */
  used_global_defaults: boolean
}
