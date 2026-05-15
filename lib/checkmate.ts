import 'server-only'

import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'

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

import {
  caseCategories,
  riskLevels,
  type CaseCategory,
  type RiskLevel,
  ANALYSIS_DISCLAIMER,
  getRiskLevel
} from '@/lib/checkmate-shared'

// ─── Zod schema ───────────────────────────────────────────────────────────────

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

export type RiskAnalysis = z.infer<typeof riskAnalysisSchema> & {
  detected_urls: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const urlPattern =
  /\b(?:https?:\/\/|www\.)[^\s<>"')\]]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"')\]]*)?/gi

export function detectUrls(input: string): string[] {
  const matches = input.match(urlPattern) ?? []
  return Array.from(
    new Set(matches.map(m => m.replace(/[.,;:!?]+$/, '')))
  )
}

// ─── Deterministic fallback ───────────────────────────────────────────────────

interface SignalResult {
  score: number
  flags: string[]
  category: CaseCategory
}

function runDeterministicSignals(
  text: string,
  urls: string[],
  hint?: string
): SignalResult {
  const lower = text.toLowerCase()
  let score = 20
  const flags: string[] = []
  let category: CaseCategory = 'unknown'

  // ── High-risk payment / identity signals (+15 each) ────────────────────────
  const paymentSignals: [RegExp, string][] = [
    [/wire\s*transfer/i, 'Mentions wire transfer'],
    [/western\s*union/i, 'Mentions Western Union'],
    [/money\s*order/i, 'Mentions money order'],
    [/gift\s*card/i, 'Requests gift card payment'],
    [/\bzelle\b/i, 'Requests Zelle payment'],
    [/\bvenmo\b/i, 'Requests Venmo payment'],
    [/cash\s*app/i, 'Requests Cash App payment'],
    [/\bcrypto\b|\bbitcoin\b|\bethereum\b|\busdt\b/i, 'Requests cryptocurrency'],
    [/cashier'?s?\s*check/i, 'Mentions cashier\'s check'],
    [/upfront\s*(fee|cost|payment|equipment|deposit)/i, 'Requires upfront payment'],
    [/advance\s*fee/i, 'Requests advance fee'],
    [/social\s*security\s*number|ssn\b/i, 'Requests Social Security number'],
    [/bank\s*(account|routing)\s*number/i, 'Requests bank account details'],
    [/routing\s*number/i, 'Requests routing number'],
    [/(your\s*)?(password|login\s*credentials)/i, 'Requests password or credentials'],
    [/verification\s*code|one[-\s]?time\s*(code|password)|otp\b/i, 'Requests verification/OTP code'],
    [/2fa\s*code|\btwo[-\s]?factor\b/i, 'Requests two-factor auth code']
  ]

  for (const [pattern, flag] of paymentSignals) {
    if (pattern.test(lower)) {
      score += 15
      flags.push(flag)
    }
  }

  // ── Job scam signals ───────────────────────────────────────────────────────
  const jobSignals: [RegExp, string][] = [
    [/purchase\s*(your\s*)?(equipment|laptop|computer|supplies)/i, 'Asks you to purchase equipment'],
    [/send\s*(you\s*)?a\s*check|mail\s*(you\s*)?a\s*check/i, 'Offer to send a check upfront'],
    [/@gmail\.com|@yahoo\.com|@hotmail\.com|@outlook\.com/i, 'Recruiter using free email domain'],
    [/no\s*experience\s*(required|needed)/i, 'Claims no experience required'],
    [/unlimited\s*(earning|income|potential)/i, 'Promises unlimited earnings'],
    [/be\s*your\s*own\s*boss/i, 'Vague "be your own boss" language'],
    [/work\s*from\s*home.*\$\d{3,}/i, 'High-pay work-from-home offer'],
    [/direct\s*message\s*only|text\s*(me\s*)?only|whatsapp\s*only/i, 'Text-only communication requested'],
    [/\$\s*\d{3,}\s*(per\s*hour|\/hr|hourly)/i, 'Unusually high hourly rate advertised']
  ]

  let jobScore = 0
  for (const [pattern, flag] of jobSignals) {
    if (pattern.test(lower)) {
      jobScore += 12
      flags.push(flag)
    }
  }

  if (jobScore > 0 || hint === 'job_scam_or_ghost_job') {
    score += jobScore
    category = 'job_scam_or_ghost_job'
  }

  // ── Phishing / URL signals ─────────────────────────────────────────────────
  const suspiciousTlds = /\.(xyz|top|click|tk|ml|ga|cf|gq|pw|cc|ru|su)\b/i
  const urlShorteners = /\b(bit\.ly|tinyurl|t\.co|goo\.gl|ow\.ly|buff\.ly|rb\.gy|short\.io)/i
  const loginLure = /(verify|confirm|update|secure|alert|account|signin|login|password).*\.(com|net|org|io)/i

  for (const url of urls) {
    if (suspiciousTlds.test(url)) {
      score += 20
      flags.push(`URL uses a high-risk domain extension: ${url}`)
    }
    if (urlShorteners.test(url)) {
      score += 15
      flags.push(`URL uses a link shortener (destination unknown): ${url}`)
    }
    if (loginLure.test(url)) {
      score += 10
      flags.push(`URL appears to mimic a login or account verification page`)
    }
  }

  if (urls.length > 0 && category === 'unknown') {
    category = 'phishing_url'
  }

  // ── Bill / fee signals ────────────────────────────────────────────────────
  const billSignals: [RegExp, string][] = [
    [/final\s*notice|last\s*(warning|notice)/i, 'Uses "final notice" language'],
    [/immediate\s*(action|payment)\s*required/i, 'Demands immediate action'],
    [/(past\s*due|overdue|delinquent)\s*(balance|account|payment)/i, 'Claims past-due balance'],
    [/collection\s*(agency|notice|action)/i, 'Threatens collection action'],
    [/legal\s*action\s*will\s*be\s*(taken|initiated)/i, 'Threatens legal action'],
    [/your\s*(account|service)\s*will\s*be\s*(suspended|terminated|cancelled)/i, 'Threatens account suspension']
  ]

  let billScore = 0
  for (const [pattern, flag] of billSignals) {
    if (lower.match(pattern)) {
      billScore += 10
      flags.push(flag)
    }
  }

  if (billScore > 0 && category === 'unknown') {
    score += billScore
    category = 'bill_or_fee'
  }

  // ── Rental / marketplace signals ──────────────────────────────────────────
  const rentalSignals: [RegExp, string][] = [
    [/send\s*(first|last)\s*month.{0,20}before\s*(viewing|tour|visit)/i, 'Requests payment before property viewing'],
    [/(overseas|military|deployed)\s*(landlord|owner)/i, 'Landlord claims to be overseas or military'],
    [/below\s*market|too\s*good\s*to\s*be\s*true/i, 'Unusually low price mentioned'],
    [/cashapp|zelle|venmo|crypto.{0,30}(rent|deposit|purchase)/i, 'Requests informal payment for rental/purchase']
  ]

  let rentalScore = 0
  for (const [pattern, flag] of rentalSignals) {
    if (lower.match(pattern)) {
      rentalScore += 12
      flags.push(flag)
    }
  }

  if (rentalScore > 0 && category === 'unknown') {
    score += rentalScore
    category = 'rental_or_marketplace'
  }

  // ── Generic urgency / pressure ────────────────────────────────────────────
  const urgencySignals: [RegExp, string][] = [
    [/act\s*now|respond\s*immediately|limited\s*time|expires?\s*(today|tonight|in\s*\d+\s*hour)/i, 'Creates artificial urgency'],
    [/you\s*have\s*been\s*selected|congratulations\s*you.{0,30}won/i, 'Uses lottery / "selected" language'],
    [/do\s*not\s*(tell|share|inform)\s*(anyone|your\s*(family|friends|bank))/i, 'Tells you to keep it secret']
  ]

  for (const [pattern, flag] of urgencySignals) {
    if (lower.match(pattern)) {
      score += 8
      flags.push(flag)
    }
  }

  // ── Apply hint ────────────────────────────────────────────────────────────
  if (hint && caseCategories.includes(hint as CaseCategory) && category === 'unknown') {
    category = hint as CaseCategory
  }

  // ── Cap score ─────────────────────────────────────────────────────────────
  score = Math.min(score, 100)

  return { score, flags, category }
}

function buildFallbackAnalysis(
  text: string,
  urls: string[],
  hint?: string
): RiskAnalysis {
  const { score, flags, category } = runDeterministicSignals(text, urls, hint)
  const risk_level = getRiskLevel(score)

  const categoryActions: Record<CaseCategory, string[]> = {
    scam_text: [
      'Do not reply, click links, or call any number in the message.',
      'Do not send money, gift cards, or share any personal information.',
      'Report the message to the FTC at reportfraud.ftc.gov.',
      'If you already shared information, contact your bank immediately.'
    ],
    job_scam_or_ghost_job: [
      'Research the company independently before responding — search the company name plus "scam" or "review".',
      'Verify the job on the company\'s official website, not the link provided.',
      'Never purchase equipment, software, or supplies at your own expense for a new job.',
      'Never deposit a check and send a portion back — this is always a scam.',
      'Do not provide SSN, bank details, or ID documents before an official offer letter.'
    ],
    bill_or_fee: [
      'Request an itemized bill and written policy in writing.',
      'Contact the company directly using a number from their official website, not the number in the message.',
      'Ask for the name, employee ID, and direct contact of the person billing you.',
      'Do not pay via gift card, wire transfer, Zelle, or cryptocurrency — legitimate billers do not require these.',
      'Verify any claimed debt with the original creditor before paying.'
    ],
    phishing_url: [
      'Do not click the link. Navigate to the official website by typing it directly in your browser.',
      'Do not enter any username, password, or personal data on a page reached through a suspicious link.',
      'Report phishing emails to your email provider and the Anti-Phishing Working Group at reportphishing@apwg.org.',
      'If you already clicked and entered info, change your password immediately and enable 2FA.'
    ],
    rental_or_marketplace: [
      'Never pay a deposit or first/last month\'s rent before viewing the property in person.',
      'Search the listing address on Google Maps and look for stock-photo use (reverse image search).',
      'Only pay through the platform\'s official payment system — not Zelle, Venmo, or wire transfer.',
      'Meet the landlord or seller in person before any money changes hands.'
    ],
    unknown: [
      'Research the sender or company through official channels before responding.',
      'Do not share personal, financial, or identity information.',
      'If in doubt, contact the relevant organization directly using contact info from their official website.'
    ]
  }

  const safeReplies: Record<CaseCategory, string> = {
    scam_text: 'I need to verify this through official channels before responding. Please send me official documentation.',
    job_scam_or_ghost_job: 'Thank you for reaching out. I\'d like to verify this opportunity through your company\'s official HR page before proceeding.',
    bill_or_fee: 'Please send me an itemized statement, the written policy that supports this charge, and your official company contact information.',
    phishing_url: 'I\'ll need to verify this by navigating to the official website directly. Please confirm your company name so I can look up the correct contact.',
    rental_or_marketplace: 'I\'d like to schedule an in-person viewing before discussing any payments or deposits.',
    unknown: 'I need to verify this independently before I can respond further. Please provide official documentation and contact information.'
  }

  const summaryByLevel: Record<RiskLevel, string> = {
    low: `This submission shows few risk signals. It may be legitimate, but it is always worth verifying through official channels before taking action.`,
    medium: `This submission contains possible risk signals${flags.length ? ', including: ' + flags.slice(0, 2).join('; ') : ''}. Review carefully and verify through official sources before responding or sending anything.`,
    high: `This submission shows multiple common red flags${flags.length ? ', including: ' + flags.slice(0, 3).join('; ') : ''}. Do not send money, personal information, or credentials until you have independently verified the sender's identity through official channels.`,
    very_high: `This submission shows strong warning signs consistent with known scam patterns${flags.length ? ', including: ' + flags.slice(0, 3).join('; ') : ''}. Do not send money, gift cards, banking information, SSN, passwords, or any personal data. This may be a scam.`
  }

  return {
    category,
    risk_score: score,
    risk_level,
    summary: summaryByLevel[risk_level],
    red_flags: flags.length ? flags : ['No specific red flags detected by automated scan — does not mean safe.'],
    recommended_actions: categoryActions[category],
    safe_reply: safeReplies[category],
    disclaimer: ANALYSIS_DISCLAIMER,
    detected_urls: urls
  }
}

// ─── AI analyzer ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = [
  'You are Ray, the friendly risk-check assistant inside the CheckRay product. You help everyday people review suspicious texts, emails, bills, links, job offers, rental listings, and marketplace conversations for possible red flags.',
  'Return only the requested structured JSON — no extra commentary.',
  '',
  '## Persona rules (MANDATORY)',
  '- Speak as Ray, a clear and helpful assistant. Do NOT claim to be a human, lawyer, investigator, doctor, banker, or financial advisor.',
  '- Refer to the product as CheckRay and refer to yourself as Ray when it is natural (e.g. "Ray noticed", "Ray suggests"). Keep references concise — do not insert "Ray" into every sentence.',
  '',
  '## Tone rules (MANDATORY)',
  '- NEVER claim certainty. Use language like "may", "appears to", "possible", "risk signals", "common red flags", "verify through official channels".',
  '- NEVER say something is "definitely safe" or "definitely a scam".',
  '- NEVER say "Ray verified this", "Ray guarantees", "Ray knows", "Ray confirms", "Ray prevents fraud", or that Ray is 100% accurate.',
  '- Do not provide legal, medical, or financial advice.',
  '- Safe replies must be non-accusatory, calm, and avoid sharing sensitive information.',
  '',
  '## Automatic risk score increases',
  'Increase risk_score by 15–20 for each of these present in the input:',
  '- Requests for: wire transfer, Western Union, money order, gift cards, Zelle, Venmo, Cash App, cryptocurrency, cashier\'s check, upfront equipment purchase, advance fee',
  '- Requests for: SSN, bank account/routing number, passwords, verification codes, OTP, 2FA codes',
  '',
  '## Job scam signals — flag as possible job_scam_or_ghost_job and raise risk_score if:',
  '- Recruiter or job offer uses a free email domain (@gmail, @yahoo, @hotmail)',
  '- Text-only or WhatsApp-only communication is required',
  '- Pay is unrealistically high for vague duties',
  '- Asks you to purchase equipment or software upfront',
  '- Offers to send a check and asks you to send money back',
  '- Asks for SSN, bank details, or government ID before a formal offer',
  '- No verifiable company website or LinkedIn',
  '',
  '## Phishing / URL signals — flag as phishing_url and raise risk_score if:',
  '- URL uses suspicious TLD (.xyz, .tk, .ml, .click, .top, .ru)',
  '- URL is shortened (bit.ly, tinyurl, etc.)',
  '- URL mimics a login or account-verification page',
  '- Input urges clicking a link immediately',
  '- Recommend visiting the official website directly instead of clicking the provided link.',
  '',
  '## Bill / fee signals:',
  '- Do NOT say the bill is valid or invalid.',
  '- Suggest requesting itemization, receipts, written policy, dates, proof, and verifying via official company contact.',
  '- Flag "final notice", "immediate action required", threats of legal action, or demands for unusual payment methods.',
  '',
  '## Rental / marketplace signals:',
  '- Flag payment before viewing, overseas/military landlord stories, unusually low prices, or informal payment methods (Zelle, Venmo, crypto).',
  '',
  '## Disclaimer requirement',
  `Always set disclaimer to exactly: "${ANALYSIS_DISCLAIMER}"`,
  '',
  '## Risk level mapping',
  'low: 0–34  |  medium: 35–64  |  high: 65–84  |  very_high: 85–100',
  'Ensure risk_level is always consistent with risk_score.'
].join('\n')

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
    'Allowed categories: ' + caseCategories.join(', '),
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
    '- summary: 2–4 sentences, plain English, no certainty claims.',
    '- red_flags: concrete list of specific signals found, each ≤ 15 words.',
    '- recommended_actions: 3–6 specific actionable steps.',
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

    // Ensure disclaimer is always the canonical string
    return {
      ...object,
      disclaimer: ANALYSIS_DISCLAIMER,
      detected_urls: detectedUrls
    }
  } catch (err) {
    console.warn('[checkmate] AI analyzer failed, using deterministic fallback:', err)
    return buildFallbackAnalysis(submittedText + ' ' + submittedUrl, detectedUrls, categoryHint)
  }
}
