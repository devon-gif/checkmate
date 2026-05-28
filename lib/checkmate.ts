/**
 * lib/checkmate.ts
 *
 * Server-only AI analysis orchestrator.
 * Imports from lib/analysis/ for schema, types, and fallback logic.
 * Use lib/checkmate-shared.ts for client-safe utilities.
 */

import 'server-only'

import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'

import { ANALYSIS_DISCLAIMER } from '@/lib/checkmate-shared'
import type { CaseCategory } from '@/lib/checkmate-shared'
import { raySystemPrompt } from '@/lib/analyzer/ray-guidelines'
import { riskAnalysisSchema } from '@/lib/analysis/schema'
import { detectUrls, buildFallbackAnalysis } from '@/lib/analysis/fallback'
import { evaluateRedFlagOverrides } from '@/lib/analysis/red-flag-overrides'
import type { RiskAnalysis } from '@/lib/analysis/types'
import {
  clampRiskScore,
  confidenceFromEvidence,
  defaultMissingInformation,
  defaultVerificationSteps,
  ensureDisclaimer,
  evidenceFromFlags,
  normalizeCategory,
  normalizeRiskLevel,
  uniqueStrings
} from '@/lib/analysis/accuracy-policy'

// Re-export everything from the shared module so server code can still import
// from a single place, and client code imports from checkmate-shared directly.
export {
  caseCategories,
  riskLevels,
  type CaseCategory,
  type RiskLevel,
  ANALYSIS_DISCLAIMER,
  humanizeCategory,
  getRiskLevel
} from '@/lib/checkmate-shared'

export { riskAnalysisSchema } from '@/lib/analysis/schema'
export { detectUrls } from '@/lib/analysis/fallback'
export type { RiskAnalysis } from '@/lib/analysis/types'

// ─── Post-processing: apply deterministic red-flag floors to AI results ───────
// Shared with the fallback path so obvious scam patterns cannot be under-scored.
type AiObject = {
  risk_score: number
  risk_level: 'low' | 'medium' | 'high' | 'very_high'
  category: CaseCategory
  confidence_level: 'low' | 'medium' | 'high'
  evidence_found: string[]
  red_flags: string[]
  missing_information: string[]
  recommended_actions: string[]
  verification_steps: string[]
  safe_reply: string
  summary: string
  disclaimer: string
}

function applyRedFlagFloors(obj: AiObject, fullText: string, urls: string[], hint?: string): AiObject {
  const override = evaluateRedFlagOverrides(fullText, urls, hint)
  if (!override) return obj

  let { risk_score, category, red_flags, safe_reply } = obj
  risk_score = Math.max(risk_score, override.minScore)
  if (override.category) category = override.category
  red_flags = uniqueStrings([...override.flags, ...red_flags])
  if (override.safeReply) safe_reply = override.safeReply
  const risk_level = normalizeRiskLevel(risk_score)

  return { ...obj, risk_score, risk_level, category, red_flags, safe_reply }
}

function finalizeAnalysis(
  obj: AiObject,
  urls: string[],
  strongSignalCount = 0
): RiskAnalysis {
  const risk_score = clampRiskScore(obj.risk_score)
  const risk_level = normalizeRiskLevel(risk_score)
  const category = normalizeCategory(obj.category)
  const red_flags = uniqueStrings(obj.red_flags)
  const missing_information = uniqueStrings(
    obj.missing_information.length
      ? obj.missing_information
      : defaultMissingInformation(category)
  )
  const verification_steps = uniqueStrings(
    obj.verification_steps.length
      ? obj.verification_steps
      : defaultVerificationSteps(category)
  ).slice(0, 5)
  const recommended_actions = uniqueStrings([
    ...obj.recommended_actions,
    ...verification_steps
  ]).slice(0, 6)
  const evidence_found = uniqueStrings(
    obj.evidence_found.length ? obj.evidence_found : evidenceFromFlags(red_flags)
  )

  return {
    category,
    risk_score,
    risk_level,
    confidence_level: confidenceFromEvidence({
      score: risk_score,
      redFlags: red_flags,
      missingInformation: missing_information,
      strongSignalCount
    }),
    summary:
      risk_level === 'low' && /safe|definitely|guarantee/i.test(obj.summary)
        ? 'Low risk based on the information provided. No major red flags were found, but that does not prove it is safe. Verify through official channels before taking action.'
        : obj.summary,
    evidence_found,
    red_flags,
    missing_information,
    recommended_actions,
    safe_reply: obj.safe_reply,
    verification_steps,
    disclaimer: ensureDisclaimer(obj.disclaimer),
    detected_urls: urls,
    used_fallback: false
  }
}

// ─── Public analyzer ──────────────────────────────────────────────────────────

export async function analyzeCase({
  text,
  url,
  categoryHint,
  forceFallback = false
}: {
  text?: string
  url?: string
  categoryHint?: string
  /** When true, skip the AI call and use the deterministic fallback only.
   *  Set via CHECKRAY_FORCE_FALLBACK=true or X-CheckRay-Test-Mode: fallback. */
  forceFallback?: boolean
}): Promise<RiskAnalysis> {
  const submittedText = text?.trim() ?? ''
  const submittedUrl = url?.trim() ?? ''
  const detectedUrls = Array.from(
    new Set([...detectUrls(submittedText), ...detectUrls(submittedUrl)])
  )

  const prompt = [
    'Analyze this submitted case and return the structured risk assessment.',
    '',
    'Allowed categories: scam_text, job_scam_or_ghost_job, bill_or_fee, phishing_url, rental_or_marketplace, email, unknown',
    categoryHint ? `Category hint from user: ${categoryHint}` : '',
    '',
    `Detected URLs: ${detectedUrls.length ? detectedUrls.join(', ') : 'none'}`,
    '',
    'Submitted URL field:',
    submittedUrl || 'none',
    '',
    'Submitted text:',
    submittedText || 'none',
    '',
    'Output requirements:',
    '- category: exactly one from the allowed list.',
    '- risk_score: integer 0–100.',
    '- risk_level: must be consistent with risk_score.',
    '- confidence_level: low, medium, or high based on evidence quality.',
    '- summary: 2–4 sentences, plain English, no certainty claims.',
    '- evidence_found: quote or paraphrase only signals observed in user-provided text/URL.',
    '- red_flags: concrete list of specific signals found, each ≤ 15 words.',
    '- missing_information: list missing context needed to verify.',
    '- recommended_actions: 3–6 specific actionable steps.',
    '- verification_steps: 2–5 official-channel checks.',
    '- safe_reply: short message the user can send if a reply is appropriate.',
    `- disclaimer: exactly "${ANALYSIS_DISCLAIMER}"`
  ]
    .filter(Boolean)
    .join('\n')

  try {
    // Skip AI if force-fallback mode is active (load tests, missing key, etc.)
    if (forceFallback || !process.env.OPENAI_API_KEY) {
      return buildFallbackAnalysis(submittedText + ' ' + submittedUrl, detectedUrls, categoryHint)
    }

    const { object } = await generateObject({
      model: openai(process.env.CHECKMATE_ANALYZER_MODEL ?? 'gpt-4o-mini'),
      schema: riskAnalysisSchema,
      system: raySystemPrompt(categoryHint),
      prompt
    })

    // Post-process: apply combo-pattern hard floors so AI can't under-score
    // critical scam patterns even if the model hedges.
    const boosted = applyRedFlagFloors(object, submittedText + ' ' + submittedUrl, detectedUrls, categoryHint)

    return finalizeAnalysis(boosted, detectedUrls)
  } catch (err) {
    console.warn('[checkmate] AI analyzer failed, using deterministic fallback:', err)
    return buildFallbackAnalysis(submittedText + ' ' + submittedUrl, detectedUrls, categoryHint)
  }
}
