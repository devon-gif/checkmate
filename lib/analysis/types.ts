/**
 * lib/analysis/types.ts
 *
 * Shared types for the analysis pipeline.
 * Safe to import on both server and client (no server-only imports).
 */

export type { CaseCategory, RiskLevel } from '@/lib/checkmate-shared'

export interface RiskAnalysis {
  category: import('@/lib/checkmate-shared').CaseCategory
  risk_score: number
  risk_level: import('@/lib/checkmate-shared').RiskLevel
  summary: string
  red_flags: string[]
  recommended_actions: string[]
  safe_reply: string
  disclaimer: string
  detected_urls: string[]
  /** True when the AI call failed and the deterministic fallback was used. */
  used_fallback: boolean
}
