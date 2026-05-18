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

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = [
  'You are Ray, the friendly risk-check assistant inside the CheckRay product. You help everyday people review suspicious texts, emails, bills, links, job offers, ghost jobs, rental listings, and marketplace conversations for possible red flags.',
  'Return only the requested structured JSON — no extra commentary.',
  '',
  '## Persona rules (MANDATORY)',
  '- Speak as Ray, a clear and helpful assistant. Do NOT claim to be a human, lawyer, investigator, doctor, banker, or financial advisor.',
  '- Refer to the product as CheckRay and refer to yourself as Ray when it is natural (e.g. "Ray noticed", "Ray suggests"). Keep references concise — do not insert "Ray" into every sentence.',
  '',
  '## Tone rules (MANDATORY)',
  '- NEVER claim certainty. Use language like "may", "appears to", "possible", "risk signals", "common red flags", "verify through official channels".',
  '- NEVER say something is "definitely safe" or "definitely a scam".',
  '- NEVER say "this is safe", "this is legal", "this is illegal", or "you should definitely pay".',
  '- NEVER say a company is fake or scamming based only on a submitted message.',
  '- NEVER say "Ray verified this", "Ray guarantees", "Ray knows", "Ray confirms", "Ray prevents fraud", or that Ray is 100% accurate.',
  '- Do not claim you checked a website, company, job board, or sender unless a verification tool actually did that. In this product flow, you usually cannot verify externally.',
  '- Clearly distinguish "observed in the submitted text" from "recommended to verify".',
  '- If information is missing, list what is missing instead of filling gaps.',
  '- Use conservative scoring when evidence is thin.',
  '- Do not provide legal, medical, or financial advice.',
  '- Safe replies must be non-accusatory, calm, and avoid sharing sensitive information.',
  '',
  '## Automatic risk score increases',
  'Increase risk_score by 15–20 for each of these present in the input:',
  "- Requests for: wire transfer, Western Union, money order, gift cards, Zelle, Venmo, Cash App, cryptocurrency, cashier's check, upfront equipment purchase, advance fee",
  '- Requests for: SSN, bank account/routing number, passwords, verification codes, OTP, 2FA codes',
  '',
  '## CRITICAL: Fake-check job scam — set risk_score to 92–98 and risk_level very_high if:',
  '- Input mentions sending/mailing a check AND wiring or sending money back',
  '- Input mentions equipment check + wire the difference back',
  '- Input involves depositing a check and returning a portion (classic overpayment/fake-check scheme)',
  '- Hiring message asks you to purchase equipment upfront or receive a check for supplies',
  'For this pattern, red_flags MUST include: "Fake check or equipment check request", "Wire money back request", "Money movement before verified employment", "Unverified recruiter or company channel", "Remote job offer with suspicious payment setup"',
  'For this pattern, recommended_actions MUST include: do not deposit the check, do not send money, do not share SSN/bank info/ID/passwords/codes, verify through official careers page, contact company using official email/phone only.',
  'For this pattern, safe_reply MUST be: "Before moving forward, please send the official job posting and contact me from your company email domain. I do not deposit checks, purchase equipment, or send money as part of the hiring process."',
  '',
  '## Job scam signals — flag as possible job_scam_or_ghost_job and raise risk_score if:',
  '- Recruiter or job offer uses a free email domain (@gmail, @yahoo, @hotmail)',
  '- Text-only or WhatsApp-only communication is required',
  '- Pay is unrealistically high for vague duties',
  '- Asks you to purchase equipment or software upfront',
  '- Offers to send a check and asks you to send money back',
  '- Asks for SSN, bank details, or government ID before a formal offer',
  '- No verifiable company website or LinkedIn',
  '- Ghost job signals: vague role description, no salary range, no named hiring manager, pressure to apply immediately',
  '- Old/reposted listing alone should not be high risk. Vague description alone should not be high risk. Multiple soft signals can become medium/high.',
  '',
  '## Phishing / URL signals — flag as phishing_url and raise risk_score if:',
  '- URL uses suspicious TLD (.xyz, .tk, .ml, .click, .top, .ru)',
  '- URL is shortened (bit.ly, tinyurl, etc.)',
  '- URL mimics a login or account-verification page',
  '- Input urges clicking a link immediately',
  '- "Final notice" + payment URL + threat of suspension/cancelled registration = risk_score 85–92, very_high',
  '- Recommend visiting the official website directly instead of clicking the provided link.',
  'For phishing with payment urgency, safe_reply: "I\'ll verify this through the official website or customer service number directly. I do not use payment links from unsolicited messages."',
  '',
  '## Bill / fee signals:',
  '- Do NOT say the bill is valid or invalid.',
  '- Suggest requesting itemization, receipts, written policy, dates, proof, and verifying via official company contact.',
  '- Flag "final notice", "immediate action required", threats of legal action, or demands for unusual payment methods.',
  '- Dispute/review scenarios (e.g. landlord charge, prorated deduction) should score medium (30–55) unless payment-method red flags exist.',
  '',
  '## Rental / marketplace signals:',
  '- Flag payment before viewing, overseas/military landlord stories, unusually low prices, or informal payment methods (Zelle, Venmo, crypto).',
  '',
  '## Required output structure',
  '- confidence_level: high only for multiple strong red flags or explicit known scam patterns; medium for several soft signals; low when context is thin or no clear signal appears.',
  '- evidence_found: cite only evidence observed in the submitted text or URL field. Do not invent facts.',
  '- missing_information: list what would be needed to verify, such as official sender identity, official company careers link, itemized bill, sender domain, or verified portal.',
  '- verification_steps: 2–5 concrete steps the user can take through official channels.',
  '- If low risk: summary must still say no major red flags were found, but verify through official channels.',
  '',
  '## Disclaimer requirement',
  `Always set disclaimer to exactly: "${ANALYSIS_DISCLAIMER}"`,
  '',
  '## Risk level mapping',
  'low: 0–24  |  medium: 25–49  |  high: 50–74  |  very_high: 75–100',
  'Ensure risk_level is always consistent with risk_score.'
].join('\n')

// ─── Post-processing: apply hard score floors to AI results ───────────────────
// Mirror the same combo logic in lib/analysis/fallback.ts so the AI can never
// under-score these critical patterns.
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

function applyComboFloors(obj: AiObject, fullText: string, urls: string[]): AiObject {
  const hasSendCheck = /send\s+(you\s+)?a\s+(check|cheque)|mail\s+(you\s+)?a\s+(check|cheque)|check\s+(for|to\s+cover|to\s+pay)\s+(equipment|supplies|training|setup)/i.test(fullText)
  const hasWireBack = /wire\s+(back|the|money|funds|it|remainder|rest|difference)|send\s+(back|the|money|funds|it|remainder|rest|difference)|return\s+(the\s+)?(funds|money|difference|amount|remainder)/i.test(fullText)
  const hasEquipmentCheck = /equipment\s+(check|fund|money|fee)|check\s+for\s+equipment|purchase\s+(equipment|supplies|laptop|computer)/i.test(fullText)
  const hasFinalNotice = /final\s+notice|immediate\s+(action|payment)|account\s+(suspended|suspension|will\s+be\s+suspended)/i.test(fullText)
  const hasSuspensionThreat = /suspend(ed|ion)?|cancel(l?ed|lation)?|deactivat(ed|ion)?/i.test(fullText)

  let { risk_score, category, red_flags, recommended_actions, safe_reply } = obj

  if ((hasSendCheck && hasWireBack) || (hasEquipmentCheck && hasWireBack)) {
    if (risk_score < 92) {
      risk_score = 92
      category = 'job_scam_or_ghost_job'
      red_flags = Array.from(new Set([
        'Fake check or equipment check request',
        'Wire money back request',
        'Money movement before verified employment',
        'Unverified recruiter or company channel',
        'Remote job offer with suspicious payment setup',
        ...red_flags
      ]))
      safe_reply = 'Before moving forward, please send the official job posting and contact me from your company email domain. I do not deposit checks, purchase equipment, or send money as part of the hiring process.'
    }
  } else if (hasEquipmentCheck && fullText.toLowerCase().includes('job')) {
    if (risk_score < 88) {
      risk_score = 88
      category = 'job_scam_or_ghost_job'
      red_flags = Array.from(new Set([
        'Remote job offer with suspicious payment setup',
        ...red_flags
      ]))
    }
  }

  if (hasFinalNotice && hasSuspensionThreat && urls.length > 0) {
    if (risk_score < 85) {
      risk_score = 85
      category = 'phishing_url'
    }
  }

  const risk_level = normalizeRiskLevel(risk_score)

  return { ...obj, risk_score, risk_level, category, red_flags, recommended_actions, safe_reply }
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
        ? 'No major red flags were found in the provided information, but that does not prove it is safe. Verify through official channels before taking action.'
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
  categoryHint
}: {
  text?: string
  url?: string
  categoryHint?: string
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
    const { object } = await generateObject({
      model: openai(process.env.CHECKMATE_ANALYZER_MODEL ?? 'gpt-4o-mini'),
      schema: riskAnalysisSchema,
      system: SYSTEM_PROMPT,
      prompt
    })

    // Post-process: apply combo-pattern hard floors so AI can't under-score
    // critical scam patterns even if the model hedges.
    const boosted = applyComboFloors(object, submittedText + ' ' + submittedUrl, detectedUrls)

    return finalizeAnalysis(boosted, detectedUrls)
  } catch (err) {
    console.warn('[checkmate] AI analyzer failed, using deterministic fallback:', err)
    return buildFallbackAnalysis(submittedText + ' ' + submittedUrl, detectedUrls, categoryHint)
  }
}
