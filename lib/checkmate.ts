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
import type { CaseCategory, RiskLevel } from '@/lib/checkmate-shared'
import { raySystemPrompt } from '@/lib/analyzer/ray-guidelines'
import { evaluateRiskFloors, riskLevelForFlooredScore, isOfficialListingSafe } from '@/lib/analyzer/risk-floors'
import { riskAnalysisSchema } from '@/lib/analysis/schema'
import { detectUrls, buildFallbackAnalysis } from '@/lib/analysis/fallback'
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
  risk_level: RiskLevel
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
  const floor = evaluateRiskFloors(fullText, urls, hint)
  if (!floor) return obj

  let { risk_score, category, red_flags, safe_reply } = obj
  risk_score = Math.max(risk_score, floor.minScore)
  if (floor.category) category = floor.category
  red_flags = uniqueStrings([...floor.redFlags, ...red_flags])
  if (floor.safeReply) safe_reply = floor.safeReply
  const risk_level = riskLevelForFlooredScore(risk_score, floor)
  const summary =
    floor.redFlags.length && /no major red flags/i.test(obj.summary)
      ? floor.summary ??
        `This submission includes hard red flags: ${floor.redFlags.slice(0, 3).join('; ')}. Verify through official channels before taking action.`
      : floor.summary && floor.minRiskLevel === 'needs_more_info'
        ? floor.summary
        : obj.summary

  return { ...obj, risk_score, risk_level, category, red_flags, safe_reply, summary }
}

/**
 * Official-listing safe-harbor for the AI path. Risk floors only RAISE scores,
 * so an AI over-score (e.g. gpt-4o-mini marking an official OpenAI/Anthropic
 * careers listing as High/Critical with invented SSN/banking/messaging-app
 * flags) cannot be corrected by floors. This caps the score into the Low band
 * when the submission is an official listing, makes no active scam request, and
 * no medium+ floor fired — and replaces the invented flags with a safety note.
 */
function applyOfficialListingCap(
  obj: AiObject,
  fullText: string,
  urls: string[],
  hint: string | undefined,
  floor: ReturnType<typeof evaluateRiskFloors>
): AiObject {
  if (!isOfficialListingSafe(fullText, urls, floor)) return obj
  return {
    ...obj,
    risk_score: Math.min(obj.risk_score, 20),
    risk_level: 'low',
    confidence_level: obj.confidence_level === 'high' ? 'medium' : obj.confidence_level,
    evidence_found: [
      'Listing appears on an official company careers page or reputable ATS',
      'No request for money, fees, banking details, or sensitive information'
    ],
    red_flags: ['No major red flags found in the provided text.'],
    summary:
      'This appears to be a legitimate listing on an official company careers page or a reputable applicant-tracking system, and it makes no request for money, payment, banking details, or sensitive personal information. No major red flags were found, but that does not prove it is safe — confirm the role and recruiter through the company’s official careers page before applying or sharing personal data.'
  }
}

function finalizeAnalysis(
  obj: AiObject,
  urls: string[],
  strongSignalCount = 0,
  usedFallback = false
): RiskAnalysis {
  const risk_score = clampRiskScore(obj.risk_score)
  const risk_level =
    obj.risk_level === 'needs_more_info' ? 'needs_more_info' : normalizeRiskLevel(risk_score)
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
        : red_flags.length && /no major red flags/i.test(obj.summary)
          ? `This submission includes hard red flags: ${red_flags.slice(0, 3).join('; ')}. Verify through official channels before taking action.`
        : obj.summary,
    evidence_found,
    red_flags,
    missing_information,
    recommended_actions,
    safe_reply: obj.safe_reply,
    verification_steps,
    disclaimer: ensureDisclaimer(obj.disclaimer),
    detected_urls: urls,
    used_fallback: usedFallback
  }
}

/**
 * Single finalization pipeline that runs on BOTH the AI-success path and
 * the deterministic-fallback path.
 *
 * Previously (bug fixed here): `analyzeCase()` returned
 * `buildFallbackAnalysis()` directly when `OPENAI_API_KEY` was missing or
 * the AI threw — bypassing `applyRedFlagFloors()` AND `finalizeAnalysis()`.
 * In production that path produced "Low (20/100) — No major red flags"
 * for inputs that *should* have hit the deterministic floors (job + Zelle
 * + equipment deposit, account-locked phishing, sensitive-credential
 * requests, etc.).
 *
 * The fix: every result — AI or fallback — flows through this function so
 * the centralized floor logic + summary clamp always apply. The
 * `used_fallback` flag is preserved through finalization so callers still
 * know which engine produced the raw scores.
 *
 * Debug-safe logging (no body, no PII) emits:
 *   raw_score / raw_level → after engine, before floors
 *   floor_score / floor_level → after floors, before clamp
 *   final_score / final_level → what the UI / email sees
 */
function finalizeWithFloors(
  raw: AiObject,
  fullText: string,
  urls: string[],
  hint: string | undefined,
  usedFallback: boolean,
  textCharLen: number
): RiskAnalysis {
  const rawScore = raw.risk_score
  const rawLevel = raw.risk_level
  const boosted = applyRedFlagFloors(raw, fullText, urls, hint)
  const floorScore = boosted.risk_score
  const floorLevel = boosted.risk_level
  // Apply the official-listing safe-harbor AFTER floors so an AI over-score on a
  // legitimate official careers/ATS listing gets capped into the Low band.
  const floor = evaluateRiskFloors(fullText, urls, hint)
  const capped = applyOfficialListingCap(boosted, fullText, urls, hint, floor)
  const final = finalizeAnalysis(capped, urls, 0, usedFallback)
  console.log(
    '[analyzer] finalized: ' +
      `used_fallback=${usedFallback} ` +
      `text_chars=${textCharLen} ` +
      `category=${final.category} ` +
      `raw_score=${rawScore} raw_level=${rawLevel} ` +
      `floor_score=${floorScore} floor_level=${floorLevel} ` +
      `final_score=${final.risk_score} final_level=${final.risk_level} ` +
      `red_flag_count=${final.red_flags.length}`
  )
  return final
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

  const fullText = submittedText + ' ' + submittedUrl
  const textCharLen = submittedText.length

  // Helper: convert the deterministic-fallback result back into the
  // AiObject shape so it flows through the SAME floor + finalize pipeline
  // as the AI result. Without this, `analyzeCase()` returned the fallback
  // raw — that's the production bug that produced "Low (20/100)" for
  // obvious job-deposit scams when the AI path was unavailable.
  const fallbackAsAiObject = (): AiObject => {
    const fb = buildFallbackAnalysis(fullText, detectedUrls, categoryHint)
    return {
      risk_score: fb.risk_score,
      risk_level: fb.risk_level,
      category: fb.category,
      confidence_level: fb.confidence_level,
      evidence_found: fb.evidence_found,
      red_flags: fb.red_flags,
      missing_information: fb.missing_information,
      recommended_actions: fb.recommended_actions,
      verification_steps: fb.verification_steps,
      safe_reply: fb.safe_reply,
      summary: fb.summary,
      disclaimer: fb.disclaimer
    }
  }

  try {
    // Skip AI if force-fallback mode is active (load tests, missing key, etc.)
    if (forceFallback || !process.env.OPENAI_API_KEY) {
      return finalizeWithFloors(
        fallbackAsAiObject(),
        fullText,
        detectedUrls,
        categoryHint,
        true,
        textCharLen
      )
    }

    const { object } = await generateObject({
      model: openai(process.env.CHECKMATE_ANALYZER_MODEL ?? 'gpt-4o-mini'),
      schema: riskAnalysisSchema,
      system: raySystemPrompt(categoryHint),
      prompt
    })

    return finalizeWithFloors(
      object,
      fullText,
      detectedUrls,
      categoryHint,
      false,
      textCharLen
    )
  } catch (err) {
    console.warn('[checkmate] AI analyzer failed, using deterministic fallback:', err)
    return finalizeWithFloors(
      fallbackAsAiObject(),
      fullText,
      detectedUrls,
      categoryHint,
      true,
      textCharLen
    )
  }
}
