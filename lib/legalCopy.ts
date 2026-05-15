/**
 * CheckMate Legal Copy Utility
 *
 * Centralises version constants and helpers for legal acceptance tracking.
 * When you update any legal document, increment the version here.
 * Users who have not accepted the new version will be prompted to accept
 * before they can continue using the app.
 */

// ---------------------------------------------------------------------------
// Version constants
// ---------------------------------------------------------------------------

export const TERMS_VERSION = '1.0.0'
export const PRIVACY_VERSION = '1.0.0'
export const AI_DISCLOSURE_VERSION = '1.0.0'
export const ACCEPTABLE_USE_VERSION = '1.0.0'

export const CURRENT_LEGAL_VERSIONS = {
  terms: TERMS_VERSION,
  privacy: PRIVACY_VERSION,
  ai_disclosure: AI_DISCLOSURE_VERSION,
  acceptable_use: ACCEPTABLE_USE_VERSION
} as const

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserLegalAcceptance {
  terms_version: string | null
  privacy_version: string | null
  ai_disclosure_version: string | null
  acceptable_use_version?: string | null
}

// ---------------------------------------------------------------------------
// Helper: does the user need to accept (or re-accept) any legal documents?
// ---------------------------------------------------------------------------

/**
 * Returns true if the user has NOT yet accepted all current legal versions.
 * Pass in the row from `user_legal_acceptances` for the current user,
 * or `null` / `undefined` if no record exists.
 */
export function requiresLegalAcceptance(
  acceptance: UserLegalAcceptance | null | undefined
): boolean {
  if (!acceptance) return true

  return (
    acceptance.terms_version !== TERMS_VERSION ||
    acceptance.privacy_version !== PRIVACY_VERSION ||
    acceptance.ai_disclosure_version !== AI_DISCLOSURE_VERSION
  )
}

// ---------------------------------------------------------------------------
// Consent checkbox label copy (used in ConsentCheckbox component)
// ---------------------------------------------------------------------------

export const CONSENT_CHECKBOX_LABEL =
  'I agree to the Terms of Service, Privacy Policy, and AI Disclosure.'

// ---------------------------------------------------------------------------
// In-app disclaimer copy (used by LegalDisclaimer component)
// ---------------------------------------------------------------------------

export const DISCLAIMER_COPY = {
  default:
    'CheckMate can be wrong. This is informational only — not legal, financial, medical, or professional advice. Verify with official sources before acting.',

  highRisk:
    'Do not send money, passwords, verification codes, bank details, SSN, ID documents, or personal information unless you have independently verified the recipient through official channels.',

  bill: 'CheckMate does not determine whether a bill, fee, debt, lease charge, or legal notice is valid or enforceable. Use this as an informational starting point and verify with the sender, your records, and a qualified professional if needed.',

  job: "CheckMate does not guarantee whether a job, employer, recruiter, or listing is legitimate. Verify through the company's official website, official email domain, and trusted channels before sharing personal information or accepting any offer.",

  phishing:
    'Do not click suspicious links or enter personal information. Visit the official website directly or contact the organization through verified channels.',

  compact: 'Informational only. Not advice. Verify before acting.'
} as const

export type DisclaimerVariant = keyof typeof DISCLAIMER_COPY
