/**
 * lib/global/countries.ts
 *
 * Static country profiles for CheckRay's global guidance layer.
 *
 * Coverage: US, UK, CA, AU, IE, EU_GENERIC
 *
 * IMPORTANT: All guidance copy is informational only.
 * CheckRay does not provide legal, financial, or regulatory advice.
 * Language is deliberately cautious ("consider reporting through…").
 */

import type { CountryScamProfile, SupportedCountryCode } from "./types"

// ---------------------------------------------------------------------------
// Country profiles
// ---------------------------------------------------------------------------

export const COUNTRY_PROFILES: Record<SupportedCountryCode, CountryScamProfile> = {
  US: {
    country_code: "US",
    display_name: "United States",
    default_locale: "en-US",
    currency: "USD",
    emergency_number: "911",
    fraud_reporting_label: "FTC (ReportFraud.ftc.gov)",
    scam_text_reporting_hint:
      "Consider forwarding suspicious texts to 7726 (SPAM), where supported by your carrier.",
    consumer_protection_hint:
      "The FTC (Federal Trade Commission) accepts scam and fraud reports at ReportFraud.ftc.gov.",
    law_enforcement_hint:
      "For internet crime, the FBI Internet Crime Complaint Center (IC3) at ic3.gov accepts reports.",
    privacy_note:
      "US residents may also contact their state Attorney General's office for local consumer protection resources.",
  },

  UK: {
    country_code: "UK",
    display_name: "United Kingdom",
    default_locale: "en-GB",
    currency: "GBP",
    emergency_number: "999",
    fraud_reporting_label: "Action Fraud (actionfraud.police.uk)",
    scam_text_reporting_hint:
      "Consider forwarding suspicious texts to 7726 (free on most UK networks) to report to your carrier.",
    consumer_protection_hint:
      "Citizens Advice (citizensadvice.org.uk) provides guidance on scams and consumer rights.",
    law_enforcement_hint:
      "Action Fraud is the UK's national fraud and cybercrime reporting centre (actionfraud.police.uk). For suspicious emails, consider using the NCSC's Suspicious Email Reporting Service (SERS) at report@phishing.gov.uk.",
    privacy_note:
      "If you have already sent money, contact your bank immediately using the official number on your card or statement.",
  },

  CA: {
    country_code: "CA",
    display_name: "Canada",
    default_locale: "en-CA",
    currency: "CAD",
    emergency_number: "911",
    fraud_reporting_label: "Canadian Anti-Fraud Centre (antifraudcentre-centreantifraude.ca)",
    scam_text_reporting_hint:
      "Consider forwarding suspicious texts to 7726 where your carrier supports it. You can also report to the CAFC.",
    consumer_protection_hint:
      "The Canadian Anti-Fraud Centre (CAFC) collects information on fraud and scams at antifraudcentre-centreantifraude.ca.",
    law_enforcement_hint:
      "For cybercrime, the RCMP and local police services accept reports. The CAFC works with law enforcement.",
    privacy_note:
      "Quebec residents may also contact the Office de la protection du consommateur (OPC).",
  },

  AU: {
    country_code: "AU",
    display_name: "Australia",
    default_locale: "en-AU",
    currency: "AUD",
    emergency_number: "000",
    fraud_reporting_label: "Scamwatch (scamwatch.gov.au)",
    scam_text_reporting_hint:
      "You can report spam SMS to the Australian Communications and Media Authority (ACMA) at acma.gov.au.",
    consumer_protection_hint:
      "Scamwatch (scamwatch.gov.au) run by the ACCC accepts scam reports and provides consumer guidance.",
    law_enforcement_hint:
      "For cybercrime, ReportCyber (cyber.gov.au/report) is the Australian Cyber Security Centre's reporting portal.",
    privacy_note:
      "If you have sent money, contact your financial institution immediately. The Australian Financial Crimes Exchange (AFCX) works with banks on fraud.",
  },

  IE: {
    country_code: "IE",
    display_name: "Ireland",
    default_locale: "en-IE",
    currency: "EUR",
    emergency_number: "999",
    fraud_reporting_label: "An Garda Síochána / Competition and Consumer Protection Commission",
    scam_text_reporting_hint:
      "Report suspicious texts to your mobile carrier. You can also report to An Garda Síochána.",
    consumer_protection_hint:
      "The Competition and Consumer Protection Commission (CCPC) at ccpc.ie provides consumer guidance on scams.",
    law_enforcement_hint:
      "Report fraud and cybercrime to An Garda Síochána (garda.ie). For online fraud, file a report at your local Garda station.",
    privacy_note:
      "The Data Protection Commission (dataprotection.ie) handles personal data concerns. Bank of Ireland and other banks have dedicated fraud lines.",
  },

  EU_GENERIC: {
    country_code: "EU_GENERIC",
    display_name: "European Union",
    default_locale: "en-EU",
    currency: "EUR",
    emergency_number: "112",
    fraud_reporting_label: "Your national consumer protection authority",
    scam_text_reporting_hint:
      "Contact your mobile carrier to report suspicious texts. Many EU countries have a national cybercrime reporting portal.",
    consumer_protection_hint:
      "Each EU member state has a national consumer protection authority. The European Consumer Centre (ECC) network at eccnet.eu can help with cross-border issues.",
    law_enforcement_hint:
      "Report cybercrime to your national police cybercrime unit. Europol's European Cybercrime Centre (EC3) coordinates EU-wide cybercrime efforts.",
    privacy_note:
      "GDPR gives you rights regarding your personal data. Contact your national Data Protection Authority (DPA) for concerns about how your data was handled.",
  },
}

// ---------------------------------------------------------------------------
// Lookup helper
// ---------------------------------------------------------------------------

/**
 * Returns the country profile for a given code, or the US profile as default.
 */
export function getCountryProfile(code: SupportedCountryCode): CountryScamProfile {
  return COUNTRY_PROFILES[code] ?? COUNTRY_PROFILES["US"]
}

/**
 * Returns true if the given string is a valid SupportedCountryCode.
 */
export function isSupportedCountryCode(code: unknown): code is SupportedCountryCode {
  return typeof code === "string" && code in COUNTRY_PROFILES
}
