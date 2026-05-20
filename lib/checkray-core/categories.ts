/**
 * lib/checkray-core/categories.ts
 *
 * Case category constants and display helpers.
 */

import type { CaseCategory } from "./types"

export const CASE_CATEGORIES: readonly CaseCategory[] = [
  "scam_text",
  "job_scam_or_ghost_job",
  "bill_or_fee",
  "phishing_url",
  "rental_or_marketplace",
  "email",
  "unknown"
]

export const CATEGORY_LABELS: Record<CaseCategory, string> = {
  scam_text: "Scam text / SMS",
  job_scam_or_ghost_job: "Job scam / ghost job",
  bill_or_fee: "Bill or fee",
  phishing_url: "Phishing URL",
  rental_or_marketplace: "Rental / marketplace",
  email: "Email / impersonation",
  unknown: "Unknown"
}

export function humanizeCategory(cat: string): string {
  return CATEGORY_LABELS[cat as CaseCategory] ?? cat.replace(/_/g, " ")
}
