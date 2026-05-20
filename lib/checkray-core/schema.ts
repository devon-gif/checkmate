/**
 * lib/checkray-core/schema.ts
 *
 * Zod schema for the Ray analysis report.
 * Used for runtime validation of API responses — on both server and client.
 *
 * Import in: API route (validate outgoing response), extension (validate API response).
 */

import { z } from "zod"

export const RiskLevelSchema = z.enum(["low", "medium", "high", "very_high"])

export const ConfidenceLevelSchema = z.enum(["low", "medium", "high"])

export const CaseCategorySchema = z.enum([
  "scam_text",
  "job_scam_or_ghost_job",
  "bill_or_fee",
  "phishing_url",
  "rental_or_marketplace",
  "email",
  "unknown"
])

export const RayReportSchema = z.object({
  category: z.string(),
  risk_score: z.number().int().min(0).max(100),
  risk_level: RiskLevelSchema,
  confidence_level: ConfidenceLevelSchema,
  summary: z.string(),
  evidence_found: z.array(z.string()).default([]),
  red_flags: z.array(z.string()).default([]),
  missing_information: z.array(z.string()).default([]),
  recommended_actions: z.array(z.string()).default([]),
  verification_steps: z.array(z.string()).default([]),
  safe_reply: z.string().default(""),
  disclaimer: z.string()
})

export const RayApiResponseSchema = z.object({
  saved: z.boolean(),
  save_reason: z
    .enum(["not_authenticated", "test_mode", "supabase_error"])
    .nullable(),
  case_id: z.string().nullable(),
  report_id: z.string().nullable(),
  used_fallback: z.boolean(),
  report: RayReportSchema,
  access: z
    .object({
      canAnalyze: z.boolean(),
      accessStatus: z.string(),
      plan: z.string().nullable(),
      checksUsed: z.number(),
      checksLimit: z.number()
    })
    .optional()
})

export type RayReportSchemaType = z.infer<typeof RayReportSchema>
export type RayApiResponseSchemaType = z.infer<typeof RayApiResponseSchema>
