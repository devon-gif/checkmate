/**
 * checkmate-shared.ts
 *
 * Pure types, constants, and client-safe utilities only.
 * No server-only imports, no AI SDK, no OpenAI — safe to import in client components.
 * The server-side analyzeCase() function lives in lib/checkmate.ts (server-only).
 */

export const caseCategories = [
  'scam_text',
  'job_scam_or_ghost_job',
  'bill_or_fee',
  'phishing_url',
  'rental_or_marketplace',
  'email',
  'unknown'
] as const

export const riskLevels = ['low', 'medium', 'high', 'very_high'] as const

export type CaseCategory = (typeof caseCategories)[number]
export type RiskLevel = (typeof riskLevels)[number]

export const ANALYSIS_DISCLAIMER =
  'Ray can be wrong. Results are informational only and not legal, financial, medical, or professional advice. Verify important decisions through official sources.'

export function humanizeCategory(cat: string): string {
  const map: Record<string, string> = {
    scam_text: 'Scam text',
    job_scam_or_ghost_job: 'Job scam / ghost job',
    bill_or_fee: 'Bill or fee',
    phishing_url: 'Phishing URL',
    rental_or_marketplace: 'Rental / marketplace',
    email: 'Email',
    unknown: 'Unknown'
  }
  return map[cat] ?? cat.replace(/_/g, ' ')
}

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 85) return 'very_high'
  if (score >= 60) return 'high'
  if (score >= 30) return 'medium'
  return 'low'
}
