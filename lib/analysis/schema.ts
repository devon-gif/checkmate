/**
 * lib/analysis/schema.ts
 *
 * Zod schemas for the AI structured-output response.
 * No server-only imports — can be tree-shaken if imported client-side,
 * but in practice is only called from lib/checkmate.ts (server-only).
 */

import { z } from 'zod'
import { caseCategories, riskLevels } from '@/lib/checkmate-shared'
import { confidenceLevels } from '@/lib/analysis/accuracy-policy'

export const riskAnalysisSchema = z.object({
  category: z.enum(caseCategories),
  risk_score: z.number().int().min(0).max(100),
  risk_level: z.enum(riskLevels),
  confidence_level: z.enum(confidenceLevels).default('low'),
  summary: z.string().min(1),
  evidence_found: z.array(z.string()).default([]),
  red_flags: z.array(z.string()).default([]),
  missing_information: z.array(z.string()).default([]),
  recommended_actions: z.array(z.string()).default([]),
  verification_steps: z.array(z.string()).default([]),
  safe_reply: z.string().min(1),
  disclaimer: z.string().min(1)
})
