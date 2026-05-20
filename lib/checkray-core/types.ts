/**
 * lib/checkray-core/types.ts
 *
 * Shared TypeScript types for the Ray analysis response contract.
 * Used by: web app, Chrome extension, email workflow, future text/SMS.
 *
 * These types reflect the stable /api/analyze-case response shape.
 * All consumers should reference this file rather than defining their own.
 */

export type RiskLevel = "low" | "medium" | "high" | "very_high"

export type CaseCategory =
  | "scam_text"
  | "job_scam_or_ghost_job"
  | "bill_or_fee"
  | "phishing_url"
  | "rental_or_marketplace"
  | "email"
  | "unknown"

export type ConfidenceLevel = "low" | "medium" | "high"

/**
 * The canonical Ray analysis report.
 * Always nested under `response.report` in the API response.
 */
export interface RayReport {
  category: CaseCategory | string
  risk_score: number          // 0–100
  risk_level: RiskLevel
  confidence_level: ConfidenceLevel
  summary: string
  evidence_found: string[]
  red_flags: string[]
  missing_information: string[]
  recommended_actions: string[]
  verification_steps: string[]
  safe_reply: string
  disclaimer: string
  /**
   * Optional country-aware guidance block.
   * Present when `country_code` was supplied in the request (or detected).
   * Consumers should treat this as supplemental — not a breaking change.
   */
  country_context?: {
    country_code: string
    display_name: string
    reporting_options: Array<{
      label: string
      detail: string
      country_code: string
      url?: string
    }>
    verification_steps: string[]
    used_global_defaults: boolean
  }
}

/**
 * Top-level /api/analyze-case response envelope.
 */
export interface RayApiResponse {
  saved: boolean
  save_reason:
    | "not_authenticated"
    | "test_mode"
    | "supabase_error"
    | null
  case_id: string | null
  report_id: string | null
  used_fallback: boolean
  report: RayReport
  access?: {
    canAnalyze: boolean
    accessStatus: string
    plan: string | null
    checksUsed: number
    checksLimit: number
  }
}

/**
 * Usage-limit response (HTTP 402).
 */
export interface RayUsageLimitResponse {
  error: "usage_limit_reached"
  message: string
  access: {
    canAnalyze: false
    accessStatus: string
    plan: string | null
    checksUsed: number
    checksLimit: number
  }
}
