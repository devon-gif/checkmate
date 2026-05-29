/**
 * lib/analysis/fallback.ts
 *
 * Deterministic rule-based fallback analyzer.
 * Used when the AI call fails or is unavailable.
 * No AI SDK imports — fully standalone.
 */

import {
  caseCategories,
  ANALYSIS_DISCLAIMER,
  type CaseCategory,
  type RiskLevel
} from '@/lib/checkmate-shared'
import { evaluateRiskFloors, isLikelyInsufficientScamContent, riskLevelForFlooredScore, buildNegationStrippedText } from '@/lib/analyzer/risk-floors'
import {
  confidenceFromEvidence,
  defaultMissingInformation,
  defaultVerificationSteps,
  evidenceFromFlags,
  safeLowRiskSummary,
  uniqueStrings
} from '@/lib/analysis/accuracy-policy'
import type { RiskAnalysis } from '@/lib/analysis/types'

// ─── URL detection ────────────────────────────────────────────────────────────

const urlPattern =
  /\b(?:https?:\/\/|www\.)[^\s<>"')\]]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"')\]]*)?/gi

export function detectUrls(input: string): string[] {
  const matches = input.match(urlPattern) ?? []
  return Array.from(new Set(matches.map(m => m.replace(/[.,;:!?]+$/, ''))))
}

// ─── Signal engine ────────────────────────────────────────────────────────────

interface SignalResult {
  score: number
  flags: string[]
  category: CaseCategory
  strongSignalCount: number
  insufficientInfo?: boolean
  safetyIssue?: boolean
}

export function runDeterministicSignals(
  text: string,
  urls: string[],
  hint?: string
): SignalResult {
  const lower = text.toLowerCase()
  // Use negation-stripped text for jobSignals so "no WhatsApp" / "no payment" don't add score.
  // Payment signals and composite checks keep using `lower` to preserve true-positive detection.
  const lowerStripped = buildNegationStrippedText(text).toLowerCase()
  let score = 20
  const flags: string[] = []
  let category: CaseCategory = 'unknown'
  let strongSignalCount = 0
  let insufficientInfo = false
  let safetyIssue = false

  const trimmed = text.trim()
  const hasSafetyEmergency =
    /\b(kill myself|suicide|self[-\s]?harm|hurt myself|hurt someone|going to kill|immediate danger|emergency)\b/i.test(
      lower
    )

  if (hasSafetyEmergency) {
    return {
      score: 70,
      flags: ['Message may involve immediate safety or crisis concerns'],
      category: 'unknown',
      strongSignalCount: 2,
      safetyIssue: true
    }
  }

  if (!urls.length && isLikelyInsufficientScamContent(trimmed, urls)) {
    return {
      score: 0,
      flags: ['Not enough scam-related content to analyze'],
      category: hint && caseCategories.includes(hint as CaseCategory) ? (hint as CaseCategory) : 'unknown',
      strongSignalCount: 0,
      insufficientInfo: true
    }
  }

  // ── High-risk payment / identity signals (+15 each) ───────────────────────
  const paymentSignals: [RegExp, string][] = [
    [/wire\s*transfer/i, 'Mentions wire transfer'],
    [/western\s*union/i, 'Mentions Western Union'],
    [/money\s*order/i, 'Mentions money order'],
    [/gift\s*card/i, 'Requests gift card payment'],
    [/\bzelle\b/i, 'Requests Zelle payment'],
    [/\bvenmo\b/i, 'Requests Venmo payment'],
    [/cash\s*app/i, 'Requests Cash App payment'],
    [/\bcrypto\b|\bbitcoin\b|\bethereum\b|\busdt\b/i, 'Requests cryptocurrency'],
    [/cashier'?s?\s*check/i, "Mentions cashier's check"],
    [/upfront\s*(fee|cost|payment|equipment|deposit)/i, 'Requires upfront payment'],
    [/equipment.{0,30}(deposit|fee|payment)|\$\s*\d+.{0,30}equipment\s+deposit/i, 'Requests an equipment deposit'],
    [/send\s+(money|funds|payment)|send\s+\$\s*\d+/i, 'Requests money to be sent'],
    [/advance\s*fee/i, 'Requests advance fee'],
    [/social\s*security\s*number|ssn\b/i, 'Requests Social Security number'],
    [/bank\s*(account|routing)\s*number/i, 'Requests bank account details'],
    [/routing\s*number/i, 'Requests routing number'],
    [/(your\s*)?(password|login\s*credentials)/i, 'Requests password or credentials'],
    [/verification\s*code|one[-\s]?time\s*(code|password)|otp\b/i, 'Requests verification/OTP code'],
    [/2fa\s*code|\btwo[-\s]?factor\b/i, 'Requests two-factor auth code']
  ]

  // Use negation-stripped text for paymentSignals so "never ask for your password",
  // "not asked me for crypto", "no gift card request", etc. don't add false score.
  for (const [pattern, flag] of paymentSignals) {
    if (pattern.test(lowerStripped)) {
      score += 15
      strongSignalCount += 1
      flags.push(flag)
    }
  }

  // ── Job scam signals ──────────────────────────────────────────────────────
  const jobSignals: [RegExp, string][] = [
    [/purchase\s*(your\s*)?(equipment|laptop|computer|supplies)/i, 'Asks you to purchase equipment'],
    [/remote.{0,30}(job|role|position|work).{0,80}(deposit|equipment fee|send\s+\$)/i, 'Remote job asks for money before verification'],
    [/reply\s+["']?(yes|interested)["']?|respond\s+["']?(yes|interested)["']?/i, 'Pressures you to reply with a quick confirmation'],
    [/deposit\s*(the\s*)?(check|cheque)/i, 'Asks you to deposit a check'],
    [/send\s*(you\s*)?a\s*check|mail\s*(you\s*)?a\s*check/i, 'Offer to send a check upfront'],
    [/wire\s*(the\s*)?(difference|remainder|rest)\s*back/i, 'Asks you to wire money back'],
    [/no\s*(interview|interviews)\b|interview\s*(not\s*)?required/i, 'No interview required'],
    [/telegram|signal|whatsapp/i, 'Moves conversation to messaging app'],
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
    if (pattern.test(lowerStripped)) {
      jobScore += 12
      flags.push(flag)
    }
  }

  if (jobScore > 0 || hint === 'job_scam_or_ghost_job') {
    score += jobScore
    category = 'job_scam_or_ghost_job'
  }

  // ── Phishing / URL signals ────────────────────────────────────────────────
  const suspiciousTlds = /\.(xyz|top|click|tk|ml|ga|cf|gq|pw|cc|ru|su)\b/i
  const urlShorteners =
    /\b(bit\.ly|tinyurl|t\.co|goo\.gl|ow\.ly|buff\.ly|rb\.gy|short\.io)/i
  const loginLure =
    /(verify|confirm|update|secure|alert|account|signin|login|password).*\.(com|net|org|io)/i
  const lookalikeUrl =
    /(support|secure|verify|account|pay|billing|toll|delivery|track|package)[-.][a-z0-9-]+\.(com|net|org|info|help)/i
  const accountLockedOrLogin =
    /account\s+(locked|suspended|restricted)|verify\s+(your\s+)?(login|account)|confirm\s+(your\s+)?(password|login)|password\s+reset/i

  if (accountLockedOrLogin.test(lower)) {
    score += 18
    strongSignalCount += 1
    flags.push('Uses account-lock or login-verification pressure')
    if (category === 'unknown') category = 'phishing_url'
  }

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
      flags.push('URL appears to mimic a login or account verification page')
    }
    if (lookalikeUrl.test(url)) {
      score += 14
      flags.push(`URL may be an unfamiliar or lookalike domain: ${url}`)
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
    [
      /send\s*(first|last)\s*month.{0,20}before\s*(viewing|tour|visit)/i,
      'Requests payment before property viewing'
    ],
    [
      /(overseas|military|deployed)\s*(landlord|owner)/i,
      'Landlord claims to be overseas or military'
    ],
    [/below\s*market|too\s*good\s*to\s*be\s*true/i, 'Unusually low price mentioned'],
    [
      /cashapp|zelle|venmo|crypto.{0,30}(rent|deposit|purchase)/i,
      'Requests informal payment for rental/purchase'
    ]
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
    [
      /act\s*now|respond\s*immediately|limited\s*time|expires?\s*(today|tonight|in\s*\d+\s*hour)/i,
      'Creates artificial urgency'
    ],
    [
      /you\s*have\s*been\s*selected|congratulations\s*you.{0,30}won/i,
      'Uses lottery / "selected" language'
    ],
    [
      /do\s*not\s*(tell|share|inform)\s*(anyone|your\s*(family|friends|bank))/i,
      'Tells you to keep it secret'
    ]
  ]

  for (const [pattern, flag] of urgencySignals) {
    if (lower.match(pattern)) {
      score += 8
      flags.push(flag)
    }
  }

  // ── Email / impersonation signals ─────────────────────────────────────────
  const emailSignals: [RegExp, string][] = [
    [/reply-to.{0,20}(mismatch|different)|from.{0,20}(mismatch|different)/i, 'Sender or reply-to mismatch'],
    [/invoice.{0,40}(new|updated).{0,20}(bank|payment|wire)/i, 'Invoice or payment instructions changed'],
    [/(ceo|boss|manager|executive).{0,40}(gift\s*card|wire|urgent)/i, 'Executive impersonation payment request'],
    [/open\s*(the\s*)?attachment|download\s*(the\s*)?file/i, 'Unexpected attachment or download request']
  ]

  let emailScore = 0
  for (const [pattern, flag] of emailSignals) {
    if (lower.match(pattern)) {
      emailScore += 12
      flags.push(flag)
    }
  }

  if (emailScore > 0 && category === 'unknown') {
    score += emailScore
    category = 'email'
  }

  // ── Apply hint ────────────────────────────────────────────────────────────
  if (hint && caseCategories.includes(hint as CaseCategory) && category === 'unknown') {
    category = hint as CaseCategory
  }

  // ── Cap score ─────────────────────────────────────────────────────────────
  score = Math.min(score, 100)

  // ── Combo-pattern hard floors (override AI and base scoring) ──────────────
  //
  // These patterns are strongly associated with known scam types.  When the
  // evidence is unambiguous the deterministic floor prevents the AI from
  // under-scoring simply because the sentence is short or well-written.

  // 1. Fake-check job scam: "send a check" + (wire | send money back) — classic
  const hasSendCheck = /(send|mail|we.?ll send|sending).{0,30}(check|cheque)/i.test(lower)
  const hasWireBack = /wire.{0,20}(back|difference|remainder|rest)|send.{0,20}money.{0,20}back|wire.{0,20}transfer/i.test(lower)
  const hasEquipmentCheck = /(check|cheque).{0,40}(equipment|laptop|computer|supplies|gear)|equipment.{0,40}(check|cheque)/i.test(lower)
  if ((hasSendCheck && hasWireBack) || (hasEquipmentCheck && hasWireBack)) {
    score = Math.max(score, 92)
    category = 'job_scam_or_ghost_job'
    strongSignalCount += 3
    if (!flags.includes('Fake check or equipment check request'))
      flags.push('Fake check or equipment check request')
    if (!flags.includes('Wire money back request'))
      flags.push('Wire money back request')
    if (!flags.includes('Money movement before verified employment'))
      flags.push('Money movement before verified employment')
    if (!flags.includes('Unverified recruiter or company channel'))
      flags.push('Unverified recruiter or company channel')
  }

  // 2. Equipment purchase in job context — strong job scam signal
  if (hasEquipmentCheck && category === 'job_scam_or_ghost_job') {
    score = Math.max(score, 88)
    strongSignalCount += 1
    if (!flags.includes('Remote job offer with suspicious payment setup'))
      flags.push('Remote job offer with suspicious payment setup')
  }

  // 3. Phishing combo: final notice + payment URL + suspension threat
  const hasFinalNotice = /final\s*notice|last\s*(warning|notice)/i.test(lower)
  const hasSuspensionThreat = /(suspended|terminated|cancelled|registration).{0,40}(may|will|could)|account.{0,30}(suspend|terminat)/i.test(lower)
  const hasPaymentUrl = urls.length > 0
  if (hasFinalNotice && hasSuspensionThreat && hasPaymentUrl) {
    score = Math.max(score, 85)
    strongSignalCount += 2
    category = category === 'unknown' ? 'phishing_url' : category
  }

  // Gift-card boss impersonation is a classic high-confidence pattern.
  if (/boss|manager|ceo|supervisor/i.test(lower) && /gift\s*card/i.test(lower) && /(code|codes|right\s*now|urgent)/i.test(lower)) {
    score = Math.max(score, 92)
    category = 'email'
    strongSignalCount += 2
    flags.push('Gift card code request from alleged boss')
    flags.push('Urgent off-channel payment request')
  }

  const hasEquipmentDeposit = /equipment.{0,30}(deposit|fee|payment)|\$\s*\d+.{0,30}equipment\s+deposit|send.{0,40}\$\s*\d+.{0,40}equipment/i.test(lower)
  const hasRemoteJob = /remote.{0,30}(job|role|position|work)|job\s+offer/i.test(lower)
  const hasReplyYes = /reply\s+["']?(yes|interested)["']?|respond\s+["']?(yes|interested)["']?/i.test(lower)
  const beforeInterview = /before\s+(the\s+)?interview|no\s+interview|without\s+interview/i.test(lower)
  if (hasEquipmentDeposit && (hasRemoteJob || hasReplyYes || beforeInterview)) {
    score = Math.max(score, 88)
    category = 'job_scam_or_ghost_job'
    strongSignalCount += 2
    flags.push('Equipment deposit requested before verified employment')
    flags.push('Remote job offer with suspicious payment setup')
    if (hasReplyYes) flags.push('Pressures you to reply quickly')
  }

  const floor = evaluateRiskFloors(text, urls, hint)
  if (floor) {
    score = Math.max(score, floor.minScore)
    if (floor.category) category = floor.category
    strongSignalCount += floor.strongSignalCount
    flags.push(...floor.redFlags)
  }

  return {
    score,
    flags: uniqueStrings(flags),
    category,
    strongSignalCount,
    insufficientInfo,
    safetyIssue
  }
}

// ─── Fallback response builder ────────────────────────────────────────────────

const categoryActions: Record<CaseCategory, string[]> = {
  scam_text: [
    'Do not reply, click links, or call any number in the message.',
    'Do not send money, gift cards, or share any personal information.',
    'Report the message to the FTC at reportfraud.ftc.gov.',
    'If you already shared information, contact your bank immediately.'
  ],
  job_scam_or_ghost_job: [
    'Research the company independently before responding.',
    "Verify the job on the company's official website, not the link provided.",
    'Never purchase equipment, software, or supplies at your own expense for a new job.',
    'Do not deposit a check and send a portion back as part of hiring.',
    'Do not provide SSN, bank details, or ID documents before an official offer letter.'
  ],
  bill_or_fee: [
    'Request an itemized bill and written policy in writing.',
    'Contact the company directly using a number from their official website, not the number in the message.',
    'Ask for the name, employee ID, and direct contact of the person billing you.',
    'Be cautious with gift card, wire transfer, Zelle, or cryptocurrency payment demands.',
    'Verify any claimed debt with the original creditor before paying.'
  ],
  phishing_url: [
    'Do not click the link. Navigate to the official website by typing it directly in your browser.',
    'Do not enter any username, password, or personal data on a page reached through a suspicious link.',
    'Report phishing emails to your email provider and the Anti-Phishing Working Group at reportphishing@apwg.org.',
    'If you already clicked and entered info, change your password immediately and enable 2FA.'
  ],
  rental_or_marketplace: [
    "Never pay a deposit or first/last month's rent before viewing the property in person.",
    'Search the listing address on Google Maps and look for stock-photo use (reverse image search).',
    "Only pay through the platform's official payment system — not Zelle, Venmo, or wire transfer.",
    'Meet the landlord or seller in person before any money changes hands.'
  ],
  email: [
    'Do not click any links in the email — navigate to the official website directly.',
    'Verify the sender address carefully — look for subtle misspellings.',
    'Do not reply with personal, financial, or login information.',
    "If the email requests action, confirm through the organization's official contact page.",
    'Report suspicious emails to your email provider as phishing or spam.'
  ],
  unknown: [
    'Research the sender or company through official channels before responding.',
    'Do not share personal, financial, or identity information.',
    'If in doubt, contact the relevant organization directly using contact info from their official website.'
  ]
}

const safeReplies: Record<CaseCategory, string> = {
  scam_text:
    'I need to verify this through official channels before responding. Please send me official documentation.',
  job_scam_or_ghost_job:
    "Thank you for reaching out. I'd like to verify this opportunity through your company's official HR page before proceeding.",
  bill_or_fee:
    'Please send me an itemized statement, the written policy that supports this charge, and your official company contact information.',
  phishing_url:
    "I'll need to verify this by navigating to the official website directly. Please confirm your company name so I can look up the correct contact.",
  rental_or_marketplace:
    "I'd like to schedule an in-person viewing before discussing any payments or deposits.",
  email:
    "Thank you for your email. I'll need to verify this request through your organization's official website before taking any action.",
  unknown:
    'I need to verify this independently before I can respond further. Please provide official documentation and contact information.'
}

const summaryByLevel: Record<RiskLevel, (flags: string[]) => string> = {
  needs_more_info: () =>
    'Not enough information to verify the risk. Please paste the suspicious message, sender, link or domain, amount requested, and what action you were asked to take.',
  low: () => safeLowRiskSummary(),
  medium: flags =>
    `This submission contains possible risk signals${flags.length ? ', including: ' + flags.slice(0, 2).join('; ') : ''}. Review carefully and verify through official sources before responding or sending anything.`,
  high: flags =>
    `This submission shows multiple common red flags${flags.length ? ', including: ' + flags.slice(0, 3).join('; ') : ''}. Do not send money, personal information, or credentials until you have independently verified the sender's identity through official channels.`,
  very_high: flags =>
    `This submission shows strong warning signs consistent with known scam patterns${flags.length ? ', including: ' + flags.slice(0, 3).join('; ') : ''}. Do not send money, gift cards, banking information, SSN, passwords, or personal data until you verify through official channels.`
}

export function buildFallbackAnalysis(
  text: string,
  urls: string[],
  hint?: string
): RiskAnalysis {
  const signalResult = runDeterministicSignals(
    text,
    urls,
    hint
  )
  const {
    flags,
    category,
    strongSignalCount,
    insufficientInfo,
    safetyIssue
  } = signalResult
  const floor = evaluateRiskFloors(text, urls, hint)
  const risk_level = riskLevelForFlooredScore(signalResult.score, floor)
  const missing_information = defaultMissingInformation(category)
  const red_flags = flags.length
    ? flags
    : ['No major red flags found in the provided text.']
  const verification_steps = defaultVerificationSteps(category)

  return {
    category,
    risk_score: signalResult.score,
    risk_level,
    confidence_level: confidenceFromEvidence({
      score: signalResult.score,
      redFlags: red_flags,
      missingInformation: missing_information,
      strongSignalCount
    }),
    summary: safetyIssue
      ? 'This message may involve immediate safety concerns, so it should not be treated as a normal scam check. If anyone is in immediate danger, contact local emergency services now; in the US, call or text 988 for mental-health crisis support.'
      : insufficientInfo
        ? 'Not enough information to verify the risk. Please paste the suspicious message, sender, link or domain, amount requested, and what action you were asked to take.'
        : floor?.summary ?? summaryByLevel[risk_level](flags),
    evidence_found: evidenceFromFlags(red_flags),
    red_flags,
    missing_information,
    recommended_actions: uniqueStrings([
      floor?.safeReply,
      ...(safetyIssue
        ? [
            'If anyone is in immediate physical danger, contact local emergency services now.',
            'If this involves self-harm or mental-health crisis in the US, call or text 988.',
            'Do not rely on a scam checker for urgent safety situations.'
          ]
        : categoryActions[category]),
      ...verification_steps
    ]).slice(0, 6),
    safe_reply: floor?.safeReply ?? safeReplies[category],
    verification_steps,
    disclaimer: ANALYSIS_DISCLAIMER,
    detected_urls: urls,
    used_fallback: true
  }
}
