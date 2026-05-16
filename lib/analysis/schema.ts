/**
 * lib/analysis/schema.ts
 *
 * Zod schemas for the AI structured-output response.
 * No server-only imports — can be tree-shaken if imported client-side,
 * but in practice is only called from lib/checkmate.ts (server-only).
 */

import { z } from 'zod'
import { caseCategories, riskLevels } from '@/lib/checkmate-shared'

export const riskAnalysisSchema = z.object({
  category: z.enum(caseCategories),
  risk_score: z.number().int().min(0).max(100),
  risk_level: z.enum(riskLevels),
  summary: z.string().min(1),
  red_flags: z.array(z.string()).default([]),
  recommended_actions: z.array(z.string()).default([]),
  safe_reply: z.string().min(1),
  disclaimer: z.string().min(1)
})
