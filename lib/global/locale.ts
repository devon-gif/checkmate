/**
 * lib/global/locale.ts
 *
 * Country detection helpers and the main assembler for localized risk guidance.
 *
 * Detection priority:
 *   1. user profile country setting (if available)
 *   2. explicit `country_code` field from the request body
 *   3. browser Accept-Language header as a weak hint
 *   4. default → "US"
 *
 * We do NOT use invasive IP geolocation.
 * We do NOT store IP addresses beyond what is already required.
 */

import type { LocalizedRiskGuidance, SupportedCountryCode } from "./types"
import { isSupportedCountryCode, getCountryProfile } from "./countries"
import { getReportingOptions, getLocalizedVerificationSteps } from "./reporting-guidance"

// ---------------------------------------------------------------------------
// Country detection
// ---------------------------------------------------------------------------

/** Default country code when nothing else is available. */
export const DEFAULT_COUNTRY: SupportedCountryCode = "US"

/**
 * Attempt to infer the best SupportedCountryCode from available signals.
 *
 * @param options.userProfileCountry  - Country from the authenticated user's profile (highest priority)
 * @param options.requestBodyCountry  - `country_code` field submitted in the request body
 * @param options.acceptLanguageHeader - Value of the `Accept-Language` HTTP header (weak hint only)
 * @returns A SupportedCountryCode, defaulting to "US"
 */
export function getCountryFromRequest(options: {
  userProfileCountry?: string | null
  requestBodyCountry?: string | null
  acceptLanguageHeader?: string | null
}): SupportedCountryCode {
  const { userProfileCountry, requestBodyCountry, acceptLanguageHeader } = options

  // 1. User profile setting (most reliable — user explicitly chose this)
  if (userProfileCountry && isSupportedCountryCode(userProfileCountry.toUpperCase())) {
    return userProfileCountry.toUpperCase() as SupportedCountryCode
  }

  // 2. Explicit request body field
  if (requestBodyCountry && isSupportedCountryCode(requestBodyCountry.toUpperCase())) {
    return requestBodyCountry.toUpperCase() as SupportedCountryCode
  }

  // 3. Accept-Language header — weak hint only, maps locale prefix to country
  if (acceptLanguageHeader) {
    const country = inferCountryFromLocale(acceptLanguageHeader)
    if (country) return country
  }

  // 4. Default
  return DEFAULT_COUNTRY
}

/**
 * Attempt to map an Accept-Language string to a SupportedCountryCode.
 * Returns null if no confident mapping can be made.
 *
 * Example inputs: "en-GB,en;q=0.9", "en-AU", "fr-FR"
 */
function inferCountryFromLocale(acceptLanguage: string): SupportedCountryCode | null {
  // Take only the first tag before comma/semicolon
  const primary = acceptLanguage.split(/[,;]/)[0]?.trim().toLowerCase() ?? ""

  // BCP-47 region suffix mappings
  const localeToCountry: Record<string, SupportedCountryCode> = {
    "en-gb": "UK",
    "en-us": "US",
    "en-ca": "CA",
    "en-au": "AU",
    "en-ie": "IE",
    // EU languages — map to EU_GENERIC as a weak signal
    "de": "EU_GENERIC",
    "de-de": "EU_GENERIC",
    "fr-fr": "EU_GENERIC",
    "nl-nl": "EU_GENERIC",
    "es-es": "EU_GENERIC",
    "it-it": "EU_GENERIC",
    "pl-pl": "EU_GENERIC",
    "pt-pt": "EU_GENERIC",
  }

  return localeToCountry[primary] ?? null
}

// ---------------------------------------------------------------------------
// Guidance assembler
// ---------------------------------------------------------------------------

/**
 * Assemble the full LocalizedRiskGuidance block for a given category and country.
 * This is the main function called by the analyze-case route.
 */
export function buildLocalizedGuidance(
  category: string,
  countryCode: SupportedCountryCode
): LocalizedRiskGuidance {
  const profile = getCountryProfile(countryCode)
  const reportingOptions = getReportingOptions(category, countryCode)
  const { steps, usedGlobalDefaults } = getLocalizedVerificationSteps(category, countryCode)

  return {
    country_code: countryCode,
    display_name: profile.display_name,
    reporting_options: reportingOptions,
    verification_steps: steps,
    used_global_defaults: usedGlobalDefaults,
  }
}
