/**
 * lib/global/reporting-guidance.ts
 *
 * Country-specific reporting options and localized verification steps
 * for each CheckRay case category.
 *
 * IMPORTANT: All guidance is informational only — not legal or financial advice.
 * Language uses cautious framing: "consider reporting through…", "use the official site…"
 *
 * Exports:
 *   getReportingOptions(category, countryCode) → ReportingOption[]
 *   getLocalizedVerificationSteps(category, countryCode) → string[]
 */

import type { ReportingOption, SupportedCountryCode } from "./types"

// ---------------------------------------------------------------------------
// Global safe defaults (apply to ALL countries / categories unless overridden)
// ---------------------------------------------------------------------------

export const GLOBAL_SAFE_DEFAULTS: string[] = [
  "Do not click links from suspicious messages.",
  "Go directly to official websites by typing the address in your browser.",
  "Contact organisations using the official phone number on their website or the back of your card — not numbers in the suspicious message.",
  "Do not send money, gift cards, cryptocurrency, codes, passwords, or bank login details.",
  "If you have already sent money or shared personal information, contact your bank immediately.",
  "Save screenshots and messages as evidence before deleting anything.",
  "If you are unsure, ask a trusted person before taking any action.",
  "If you feel you are in immediate danger, contact your local emergency services.",
]

// ---------------------------------------------------------------------------
// Reporting options by country
// ---------------------------------------------------------------------------

// Each entry is keyed by SupportedCountryCode.
// Category-specific entries override or extend the per-country defaults.

const REPORTING_OPTIONS: Record<SupportedCountryCode, ReportingOption[]> = {
  US: [
    {
      label: "Report to the FTC",
      detail: "Consider reporting scams and fraud to the Federal Trade Commission at ReportFraud.ftc.gov. The FTC uses reports to identify patterns and alert the public.",
      country_code: "US",
      url: "https://reportfraud.ftc.gov",
    },
    {
      label: "Report internet crime to the FBI IC3",
      detail: "For internet-based scams, consider filing a report with the FBI's Internet Crime Complaint Center at ic3.gov.",
      country_code: "US",
      url: "https://www.ic3.gov",
    },
    {
      label: "Forward suspicious texts to 7726",
      detail: "Consider forwarding suspicious text messages to 7726 (SPAM) where your carrier supports it. This is free on most US networks.",
      country_code: "US",
    },
    {
      label: "Contact your bank directly",
      detail: "If money was sent or financial information was shared, contact your bank or card issuer immediately using the official number on your card or their official website.",
      country_code: "US",
    },
  ],

  UK: [
    {
      label: "Report to Action Fraud",
      detail: "Consider reporting fraud and internet crime to Action Fraud, the UK's national reporting centre, at actionfraud.police.uk or by calling 0300 123 2040.",
      country_code: "UK",
      url: "https://www.actionfraud.police.uk",
    },
    {
      label: "Forward suspicious texts to 7726",
      detail: "Consider forwarding suspicious texts to 7726 (SPAM). This is free on most UK mobile networks and reports the number to your carrier.",
      country_code: "UK",
    },
    {
      label: "Report phishing emails to NCSC",
      detail: "Consider forwarding suspicious emails to report@phishing.gov.uk — the NCSC's Suspicious Email Reporting Service (SERS).",
      country_code: "UK",
    },
    {
      label: "Contact your bank directly",
      detail: "If money was sent or financial information was shared, contact your bank immediately using the number on the back of your card or their official website. Do not use numbers provided in the suspicious message.",
      country_code: "UK",
    },
  ],

  CA: [
    {
      label: "Report to the Canadian Anti-Fraud Centre",
      detail: "Consider reporting fraud and scams to the CAFC at antifraudcentre-centreantifraude.ca or by calling 1-888-495-8501.",
      country_code: "CA",
      url: "https://www.antifraudcentre-centreantifraude.ca",
    },
    {
      label: "Forward suspicious texts to 7726",
      detail: "Consider forwarding suspicious texts to 7726 where your carrier supports it.",
      country_code: "CA",
    },
    {
      label: "Contact your bank directly",
      detail: "If money was sent or financial information was shared, contact your bank immediately using the official number on your card or their official website.",
      country_code: "CA",
    },
  ],

  AU: [
    {
      label: "Report to Scamwatch",
      detail: "Consider reporting scams to Scamwatch, run by the ACCC, at scamwatch.gov.au. Reports help warn other Australians.",
      country_code: "AU",
      url: "https://www.scamwatch.gov.au",
    },
    {
      label: "Report cybercrime to ReportCyber",
      detail: "For internet-based scams, consider reporting to the Australian Cyber Security Centre's ReportCyber portal at cyber.gov.au/report.",
      country_code: "AU",
      url: "https://www.cyber.gov.au/report",
    },
    {
      label: "Report spam messages",
      detail: "You can report spam SMS to the ACMA at acma.gov.au. Use your phone's built-in reporting feature where available.",
      country_code: "AU",
      url: "https://www.acma.gov.au",
    },
    {
      label: "Contact your bank directly",
      detail: "If money was sent or financial information was shared, contact your financial institution immediately using the official number on your card or their official website.",
      country_code: "AU",
    },
  ],

  IE: [
    {
      label: "Report to An Garda Síochána",
      detail: "Consider reporting fraud to An Garda Síochána at your local Garda station or via garda.ie. For online fraud, contact the Garda National Cyber Crime Bureau.",
      country_code: "IE",
      url: "https://www.garda.ie",
    },
    {
      label: "Contact the CCPC",
      detail: "The Competition and Consumer Protection Commission (CCPC) at ccpc.ie provides guidance on consumer scams and unfair practices.",
      country_code: "IE",
      url: "https://www.ccpc.ie",
    },
    {
      label: "Report phishing to your carrier",
      detail: "Contact your mobile carrier to report suspicious texts. You may also be able to forward them to 7726.",
      country_code: "IE",
    },
    {
      label: "Contact your bank directly",
      detail: "If money was sent or financial information was shared, contact your bank immediately using the official number on your card or statement. Do not use numbers provided in the suspicious message.",
      country_code: "IE",
    },
  ],

  EU_GENERIC: [
    {
      label: "Report to your national authority",
      detail: "Consider reporting to your country's national consumer protection authority or cybercrime reporting portal. Each EU member state has its own body.",
      country_code: "EU_GENERIC",
    },
    {
      label: "Contact your bank directly",
      detail: "If money was sent or financial information was shared, contact your bank immediately using the official number on their official website or your card.",
      country_code: "EU_GENERIC",
    },
    {
      label: "European Consumer Centre",
      detail: "For cross-border scams within the EU, the European Consumer Centre (ECC) network at eccnet.eu may be able to help.",
      country_code: "EU_GENERIC",
      url: "https://www.eccnet.eu",
    },
  ],
}

// ---------------------------------------------------------------------------
// Category-specific verification steps, by country
// ---------------------------------------------------------------------------
// Key format: `${category}:${countryCode}` — falls back to `${category}:default`
// then to GLOBAL_SAFE_DEFAULTS.

type GuidanceKey = string // `${category}:${SupportedCountryCode}` | `${category}:default`

const VERIFICATION_STEPS: Record<GuidanceKey, string[]> = {

  // ── phishing_url ────────────────────────────────────────────────────────
  "phishing_url:default": [
    "Do not click the link. Even visiting a phishing page can put your device at risk.",
    "Go to the official website by typing the address directly in your browser.",
    "Look up the official contact number for the organisation and call them to verify.",
    "Check the sender's domain carefully — scammers use near-identical domains.",
    "If you did click the link, consider running a security scan on your device.",
  ],
  "phishing_url:UK": [
    "Do not click the link.",
    "Go to the official website by typing the address in your browser.",
    "Forward suspicious emails to report@phishing.gov.uk (NCSC SERS).",
    "Forward suspicious texts to 7726.",
    "Check the sender's email domain for subtle misspellings.",
    "If you clicked the link and entered details, contact your bank immediately.",
  ],
  "phishing_url:US": [
    "Do not click the link.",
    "Go to the official website by typing the address directly.",
    "Forward suspicious texts to 7726 where your carrier supports it.",
    "Report the phishing attempt to the FTC at ReportFraud.ftc.gov.",
    "If you entered any personal information, consider placing a fraud alert with the major credit bureaus.",
  ],
  "phishing_url:AU": [
    "Do not click the link.",
    "Visit the official website directly by typing the address in your browser.",
    "Report the scam to Scamwatch at scamwatch.gov.au.",
    "Report cybercrime to ReportCyber at cyber.gov.au/report.",
    "If you entered financial details, contact your bank immediately.",
  ],

  // ── job_scam_or_ghost_job ───────────────────────────────────────────────
  "job_scam_or_ghost_job:default": [
    "Search for the company on an official business registry or their main website — not links in the offer.",
    "Do not deposit a cheque and wire back the difference. Legitimate employers do not do this.",
    "Do not pay any upfront fees for equipment, training, or background checks.",
    "Verify the recruiter's email domain — free email addresses (gmail, yahoo) are a red flag for corporate roles.",
    "Call the company directly using the number on their official website to confirm the role exists.",
  ],
  "job_scam_or_ghost_job:US": [
    "Search for the company on the official Secretary of State business registry or LinkedIn.",
    "Do not deposit a cheque and wire money back — this is a classic overpayment scam.",
    "Do not pay upfront for equipment, training, or a background check.",
    "Verify the recruiter using the company's official careers page.",
    "Consider reporting to the FTC at ReportFraud.ftc.gov and the FBI IC3 at ic3.gov.",
  ],
  "job_scam_or_ghost_job:UK": [
    "Check the company on Companies House (companieshouse.gov.uk).",
    "Do not deposit a cheque and wire back the difference.",
    "Do not pay upfront fees for equipment, a DBS check, or training.",
    "Verify the recruiter using the company's official website and careers page.",
    "Consider reporting to Action Fraud at actionfraud.police.uk.",
  ],
  "job_scam_or_ghost_job:CA": [
    "Search for the company on the Canada Business Registry (ic.gc.ca).",
    "Do not deposit a cheque and wire back the difference.",
    "Do not pay upfront for equipment or a background check.",
    "Verify using the company's official website.",
    "Consider reporting to the Canadian Anti-Fraud Centre at antifraudcentre-centreantifraude.ca.",
  ],
  "job_scam_or_ghost_job:AU": [
    "Check the company on the ASIC register (search.asic.gov.au).",
    "Do not deposit a cheque and return the difference.",
    "Do not pay for equipment or training upfront.",
    "Verify using the company's official website and careers page.",
    "Consider reporting to Scamwatch at scamwatch.gov.au.",
  ],

  // ── bill_or_fee ────────────────────────────────────────────────────────
  "bill_or_fee:default": [
    "Do not pay using methods in the message (links, QR codes, unusual payment methods).",
    "Look up the organisation's official contact information independently — not from the message.",
    "Contact the organisation directly to verify whether the bill is legitimate.",
    "Check any account portals you have with the organisation by logging in directly.",
    "Legitimate organisations do not demand immediate payment via gift cards, wire transfer, or cryptocurrency.",
  ],
  "bill_or_fee:US": [
    "Do not click payment links in the message.",
    "Look up the official website or number for the agency/company and contact them directly.",
    "For toll notices, visit your state's official toll authority website to verify.",
    "For IRS communications: the IRS contacts taxpayers primarily by mail, not text or email.",
    "Consider reporting fake bills to the FTC at ReportFraud.ftc.gov.",
  ],
  "bill_or_fee:UK": [
    "Do not click payment links. Contact the organisation using the number on their official website.",
    "For HMRC communications: HMRC does not ask for payment via text or email links.",
    "For fake toll/delivery notices, report to Action Fraud at actionfraud.police.uk.",
    "Forward suspicious texts to 7726.",
  ],
  "bill_or_fee:AU": [
    "Do not click payment links. Go to the official website directly.",
    "For ATO (tax office) concerns: the ATO does not ask for payment via iTunes cards, cryptocurrency, or wire transfer.",
    "Consider reporting to Scamwatch at scamwatch.gov.au.",
  ],

  // ── rental_or_marketplace ──────────────────────────────────────────────
  "rental_or_marketplace:default": [
    "Never pay a deposit or first month's rent before seeing a property in person or via a verified video call.",
    "Be cautious of listings that are significantly below market price.",
    "Verify the landlord or seller's identity independently.",
    "Use payment methods with consumer protection (credit card, not wire transfer or gift cards).",
    "Search the property address on official sources to verify ownership if possible.",
  ],
  "rental_or_marketplace:UK": [
    "Verify properties on official portals (Rightmove, Zoopla) and check against land registry records.",
    "Never pay a holding deposit via bank transfer to someone you have not met in person.",
    "Consider reporting rental scams to Action Fraud at actionfraud.police.uk.",
  ],
  "rental_or_marketplace:US": [
    "Never send a deposit via wire transfer or gift cards.",
    "Verify the property on county assessor records and major listing platforms.",
    "Report rental scams to the FTC at ReportFraud.ftc.gov.",
  ],

  // ── email (email/impersonation) ────────────────────────────────────────
  "email:default": [
    "Check the sender's actual email domain — hover over or tap the address to see the full address.",
    "Do not click links or download attachments from unexpected emails.",
    "Contact the organisation directly using their official website or phone number.",
    "Look for signs of urgency or pressure — legitimate organisations rarely demand immediate action via email.",
    "Report suspected phishing emails to your email provider.",
  ],
  "email:UK": [
    "Check the sender domain for subtle misspellings.",
    "Forward phishing emails to report@phishing.gov.uk (NCSC SERS).",
    "Do not click links or download attachments.",
    "Contact the organisation using their official number.",
  ],
  "email:US": [
    "Check the sender domain carefully.",
    "Do not click links. Go to the official website directly.",
    "Forward phishing emails to reportphishing@apwg.org or the relevant company's abuse address.",
    "Report to the FTC at ReportFraud.ftc.gov.",
  ],

  // ── scam_text ──────────────────────────────────────────────────────────
  "scam_text:default": [
    "Do not reply to the message or call the number in it.",
    "Do not click any links.",
    "Forward the message to 7726 (SPAM) where your carrier supports it.",
    "Block the sender.",
    "Contact the organisation being impersonated using their official number or website.",
  ],
  "scam_text:UK": [
    "Do not reply or click links.",
    "Forward to 7726 (free on most UK networks).",
    "Report to Action Fraud at actionfraud.police.uk if financial loss occurred or was attempted.",
    "Block the sender.",
  ],
  "scam_text:AU": [
    "Do not reply or click links.",
    "Report to ACMA at acma.gov.au.",
    "Report to Scamwatch at scamwatch.gov.au.",
    "Block the sender.",
  ],

  // ── unknown ────────────────────────────────────────────────────────────
  "unknown:default": [
    "Do not take any action requested in the message until you have verified it independently.",
    "Contact the organisation it claims to be from using official contact details — not those in the message.",
    "Ask a trusted person to review the message with you.",
  ],
}

// ---------------------------------------------------------------------------
// Public accessor functions
// ---------------------------------------------------------------------------

/**
 * Returns reporting options for a category and country code.
 * Falls back to country-level defaults if no category override exists.
 */
export function getReportingOptions(
  _category: string,
  countryCode: SupportedCountryCode
): ReportingOption[] {
  // Currently all categories share per-country reporting options.
  // Category-level overrides can be added here in future.
  return REPORTING_OPTIONS[countryCode] ?? REPORTING_OPTIONS["US"]
}

/**
 * Returns localized verification steps for a category and country.
 * Priority: category:country → category:default → GLOBAL_SAFE_DEFAULTS
 */
export function getLocalizedVerificationSteps(
  category: string,
  countryCode: SupportedCountryCode
): { steps: string[]; usedGlobalDefaults: boolean } {
  const specificKey = `${category}:${countryCode}`
  const defaultKey = `${category}:default`

  if (VERIFICATION_STEPS[specificKey]) {
    return { steps: VERIFICATION_STEPS[specificKey], usedGlobalDefaults: false }
  }
  if (VERIFICATION_STEPS[defaultKey]) {
    return { steps: VERIFICATION_STEPS[defaultKey], usedGlobalDefaults: false }
  }
  return { steps: GLOBAL_SAFE_DEFAULTS, usedGlobalDefaults: true }
}
