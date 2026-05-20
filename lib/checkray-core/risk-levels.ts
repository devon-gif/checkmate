/**
 * lib/checkray-core/risk-levels.ts
 *
 * Risk level helpers shared across web, extension, email, and future workflows.
 */

import type { RiskLevel } from "./types"

export const RISK_LEVELS = ["low", "medium", "high", "very_high"] as const

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
  very_high: "Very high risk"
}

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#f97316",
  very_high: "#ef4444"
}

/**
 * Derive risk level from a numeric score.
 * Mirrors the getRiskLevel() in checkmate-shared.ts.
 * Threshold: very_high ≥75, high ≥50, medium ≥25, else low.
 */
export function normalizeRiskLevel(score: number): RiskLevel {
  if (score >= 75) return "very_high"
  if (score >= 50) return "high"
  if (score >= 25) return "medium"
  return "low"
}

/**
 * Clamp and round a risk score to a valid 0–100 integer.
 */
export function normalizeRiskScore(raw: number | undefined | null): number {
  if (raw === undefined || raw === null || isNaN(raw)) return 0
  return Math.min(100, Math.max(0, Math.round(raw)))
}

/**
 * Returns a human-friendly score string: "85 / 100 · Very high risk"
 */
export function formatRiskScore(score: number, level: RiskLevel): string {
  return `${score} / 100 · ${RISK_LEVEL_LABELS[level]}`
}
