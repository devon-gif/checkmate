import {
  caseCategories,
  getRiskLevel,
  type CaseCategory,
  type RiskLevel
} from '@/lib/checkmate-shared'

export interface RiskFloorResult {
  minScore: number
  minRiskLevel: RiskLevel
  category?: CaseCategory
  redFlags: string[]
  strongSignalCount: number
  summary?: string
  safeReply?: string
}

const jobContextPattern =
  /\b(job|jobs|recruiter|interview|remote assistant|resume|hiring|hire|offer|employment|onboarding|work from home|remote work|remote job|role|position)\b/i
const impliedJobEquipmentPattern = /\b(laptop|computer|equipment)\b/i
const jobFloorSignalPattern =
  /\b(equipment deposit|upfront payment|send money|pay a fee|fake check|mobile deposit|zelle|cash\s*app|venmo|wire transfer|crypto|bitcoin|ethereum|usdt|gift cards?|before the interview|before interview|no\s+interviews?|whatsapp|telegram)\b|\breply\s+["']?(yes|interested)["']?\b/i
const criticalJobSignalPattern =
  /\b(zelle|cash\s*app|venmo|payment app|deposit|crypto|bitcoin|ethereum|usdt|gift cards?|wire transfer|fake check|mobile deposit|banking info|bank account|routing number)\b/i
const equipmentDepositPattern =
  /\b(equipment|laptop|computer).{0,35}\b(deposit|fee|payment)\b|\b(deposit|fee|payment).{0,35}\b(equipment|laptop|computer)\b/i
const replyQuicklyPattern =
  /\breply\s+["']?(yes|interested)["']?\b|\brespond\s+["']?(yes|interested)["']?\b|\b(today|immediately|right now|asap|urgent)\b/i
const beforeInterviewPattern = /\bbefore\s+(the\s+)?interview\b/i
const paymentAppPattern = /\b(zelle|cash\s*app|venmo|paypal|payment app)\b/i

const phishingFloorSignalPattern =
  /\b(account locked|account suspended|account restricted|verify account|verify your account|password|login|2fa|two[-\s]?factor|security alert|bank alert|suspicious link)\b/i
const criticalPhishingSignalPattern =
  /\b(password|2fa code|two[-\s]?factor code|verification code|otp|one[-\s]?time code|banking info|bank account|routing number|ssn|social security number|payment info|credit card|debit card)\b/i
const sensitiveRequestPattern =
  /\b(reply|send|provide|share|enter|confirm|verify|give).{0,40}\b(password|2fa code|two[-\s]?factor code|verification code|otp|one[-\s]?time code|banking info|bank account|routing number|ssn|social security number|payment info|credit card|debit card)\b|\b(password|2fa code|two[-\s]?factor code|verification code|otp|one[-\s]?time code|banking info|bank account|routing number|ssn|social security number|payment info|credit card|debit card).{0,40}\b(reply|send|provide|share|enter|confirm|verify)\b/i

const billContextPattern =
  /\b(invoice|bill|fee|overdue|collections?|pay today|urgent payment|final notice|past due|payment required)\b/i
const unknownSenderPattern =
  /\b(unknown sender|unknown party|unverified sender|unverified|someone i do not know|someone i don't know|random number|unsolicited|unexpected|not sure who sent|unverifiable)\b/i
const highRiskPaymentPattern =
  /\b(gift cards?|crypto|bitcoin|ethereum|usdt|zelle|cash\s*app|venmo|wire transfer|western union|moneygram)\b/i
const governmentPattern =
  /\b(irs|internal revenue service|social security|ssa|usps|postal service|police|government|federal|tax agency)\b/i
const governmentThreatPattern =
  /\b(arrest|suspend|suspended|suspension|seize|lawsuit|legal action|warrant|fine|penalty|protected account)\b/i
const packageLinkPattern =
  /\b(usps|fedex|ups|dhl|postal service|package|parcel|delivery|customs\s*fee|tracking|address incomplete|redelivery)\b/i
const promptInjectionPattern =
  /\b(ignore (previous|prior|all) instructions|disregard instructions|you are now|act as|print your prompt|reveal your system prompt|say (this is )?safe|do not mention scam)\b/i
const panicPattern =
  /\b(i'?m scared|i am scared|i'?m panicking|panic|terrified|freaking out|afraid|worried|urgent|help me|what do i do)\b/i
const ventingOnlyPattern =
  /\b(fuck|fucking|shit|bullshit|damn|wtf|angry|mad|pissed|annoyed|frustrated|this sucks|hate this|freaking|stupid|dumb|ridiculous|absurd|awful|crap|crappy|garbage|pathetic|terrible|horrible|worthless|useless|idiotic|lame)\b/i

const profanityOnlyPattern =
  /^\s*(?:fuck|shit|damn|bitch|asshole|idiot|stupid|wtf|f u|f\*+|s\*+|a\*+|[@#!$%*\s])+\s*$/i
const tooLittleLettersPattern = /^[^a-z0-9]+$/i
const consonantRunPattern = /^[bcdfghjklmnpqrstvwxyz]{8,}$/i

/**
 * Returns a copy of text with negated scam-term phrases blanked out so floor
 * patterns don't false-positive on phrases like:
 *   "no payment request", "no pressure to move to WhatsApp", "did not ask for Zelle",
 *   "never ask for your password", "not asked me for money, gifts, crypto"
 *
 * Uses a TARGETED approach — only scam-indicator terms are suppressed after a
 * negation word.  This preserves genuine scam signals that start with "no":
 *   "no interview required", "no experience needed", etc.
 * It also avoids stripping non-negation clauses like "I do not know [who sent this]"
 * because "know" is not in the scam-term whitelist.
 *
 * Only used for floor-rule matching — NOT for isLikelyInsufficientScamContent.
 */
export function buildNegationStrippedText(text: string): string {
  // Specific scam terms we want to suppress when negated by the user/victim
  const SCAM_ALTS = [
    'payment(?:\\s+(?:request|required|link|demand))?',
    'zelle', 'venmo', 'cash\\s*app', 'paypal',
    'wire\\s*transfers?',
    'bitcoin', 'ethereum', 'usdt', 'crypto(?:currency)?',
    'gift\\s*cards?',
    'deposits?(?:\\s+(?:fee|requirement))?',
    'upfront\\s*(?:fee|payment|cost|deposit)',
    'advance\\s*fee',
    'whatsapp', 'telegram', 'signal(?:\\s+app)?',
    'banking\\s*(?:info|information|details)',
    'bank(?:ing)?\\s*(?:account|info(?:rmation)?|details?)',
    'routing\\s*numbers?',
    'passwords?',
    '2fa(?:\\s*code)?', 'two[-\\s]?factor(?:\\s*(?:auth(?:entication)?|code))?',
    'verification\\s*codes?', '\\botp\\b',
    'suspicious\\s*links?',
    'personal\\s*(?:banking\\s*)?(?:info(?:rmation)?|details?|data)',
    'ssn', 'social\\s*security(?:\\s*number)?',
    'money(?:\\s+(?:request|transfer|order))?',
    'urgency', 'urgent\\s*(?:payment|deadline|demand)',
  ].join('|')

  const NEG =
    '(?:no|not|never|without|doesn?\'?t|didn?\'?t|don?\'?t|isn?\'?t|wasn?\'?t|' +
    'hasn?\'?t|haven?\'?t|do\\s+not|did\\s+not|does\\s+not|is\\s+not|was\\s+not|' +
    'has\\s+no|have\\s+no|there(?:\'s|\\s+is)\\s+no|there\\s+are\\s+no|without\\s+any)'

  let result = text

  // Pass 1 — "not/didn't ask (me/you) for [list until sentence end]"
  // Handles: "not asked me for money, gifts, crypto, or any investment"
  result = result.replace(
    /\b(?:not|didn?'?t|doesn?'?t|hasn?'?t|haven?'?t|do\s+not|did\s+not|does\s+not)\s+ask(?:ed|ing)?(?:\s+(?:me|you|anyone))?(?:\s+for)?\s+[^.!?\n]+/gi,
    m => ' '.repeat(m.length)
  )

  // Pass 2 — "[negation] [0-5 filler words] [SCAM_TERM] [rest until punctuation]"
  // Handles: "no urgent payment demand", "no pressure to move to WhatsApp",
  //          "no request for banking info", "never ask for your password"
  // Does NOT match: "no interview required" (interview not in SCAM_ALTS),
  //                 "I do not know says I owe..." (know not in SCAM_ALTS → no match),
  //                 "no experience needed" (experience not in SCAM_ALTS)
  result = result.replace(
    new RegExp(
      `\\b${NEG}\\b(?:\\s+\\w+){0,5}\\s*(?:${SCAM_ALTS})\\b[^,;.!?\\n]*`,
      'gi'
    ),
    m => ' '.repeat(m.length)
  )

  return result
}

export function isLikelyInsufficientScamContent(text: string, urls: string[]): boolean {
  const trimmed = text.trim()
  if (urls.length > 0) return false
  if (!trimmed) return true
  if (trimmed.length < 10) return true
  if (profanityOnlyPattern.test(trimmed)) return true

  const compact = trimmed.replace(/\s+/g, '')
  if (tooLittleLettersPattern.test(compact)) return true
  if (consonantRunPattern.test(compact)) return true

  const hasRiskSignal =
    jobFloorSignalPattern.test(trimmed) ||
    phishingFloorSignalPattern.test(trimmed) ||
    billContextPattern.test(trimmed) ||
    highRiskPaymentPattern.test(trimmed) ||
    sensitiveRequestPattern.test(trimmed) ||
    governmentPattern.test(trimmed) ||
    packageLinkPattern.test(trimmed)

  if (ventingOnlyPattern.test(trimmed) && !hasRiskSignal) return true

  if (/\b(asdf|qwer|zzzz|lorem ipsum|haha nothing|nothing)\b/i.test(trimmed)) {
    return !hasRiskSignal
  }

  const words = trimmed.match(/[a-z0-9]+/gi) ?? []
  if (words.length <= 3) {
    return !hasRiskSignal
  }

  return false
}

function validHint(hint?: string): CaseCategory | undefined {
  return hint && caseCategories.includes(hint as CaseCategory)
    ? (hint as CaseCategory)
    : undefined
}

function addFlag(flags: string[], condition: boolean, flag: string) {
  if (condition) flags.push(flag)
}

function mergeFloors(floors: RiskFloorResult[]): RiskFloorResult | null {
  if (!floors.length) return null

  return floors.reduce<RiskFloorResult>((best, floor) => {
    const floorIsHigher = floor.minScore > best.minScore
    const nextCategory =
      floorIsHigher && floor.category !== 'unknown'
        ? floor.category ?? best.category
        : best.category ?? floor.category
    return {
      minScore: Math.max(best.minScore, floor.minScore),
      minRiskLevel: floorIsHigher ? floor.minRiskLevel : best.minRiskLevel,
      category: nextCategory,
      redFlags: Array.from(new Set([...best.redFlags, ...floor.redFlags])),
      strongSignalCount: best.strongSignalCount + floor.strongSignalCount,
      summary: floorIsHigher ? floor.summary ?? best.summary : best.summary ?? floor.summary,
      safeReply: floor.safeReply ?? best.safeReply
    }
  }, floors[0])
}

export function evaluateRiskFloors(
  text: string,
  urls: string[],
  hint?: string
): RiskFloorResult | null {
  const normalized = text.toLowerCase()
  // Use negation-stripped text for floor pattern matching so "no WhatsApp" / "no payment"
  // phrases don't trigger floors. Original text is preserved for isLikelyInsufficientScamContent.
  const stripped = buildNegationStrippedText(text).toLowerCase()
  const hintCategory = validHint(hint)
  const floors: RiskFloorResult[] = []

  if (isLikelyInsufficientScamContent(text, urls)) {
    return {
      minScore: 0,
      minRiskLevel: 'needs_more_info',
      category: hintCategory ?? 'unknown',
      redFlags: ['Not enough scam-related content to analyze'],
      strongSignalCount: 0,
      summary:
        'Not enough information to verify the risk. Please paste the suspicious message, sender, link or domain, amount requested, and what action you were asked to take.'
    }
  }

  const isJob =
    jobContextPattern.test(stripped) ||
    hintCategory === 'job_scam_or_ghost_job' ||
    (impliedJobEquipmentPattern.test(stripped) &&
      (criticalJobSignalPattern.test(stripped) || beforeInterviewPattern.test(stripped)))
  const hasJobFloorSignal = jobFloorSignalPattern.test(stripped)
  const hasCriticalJobSignal = criticalJobSignalPattern.test(stripped)

  if (isJob && hasJobFloorSignal) {
    const flags: string[] = []
    addFlag(flags, equipmentDepositPattern.test(stripped), 'upfront equipment deposit')
    addFlag(flags, replyQuicklyPattern.test(stripped), 'pressure to reply quickly')
    addFlag(flags, beforeInterviewPattern.test(stripped), 'payment requested before interview')
    addFlag(flags, paymentAppPattern.test(stripped), 'Zelle/payment app request')
    addFlag(flags, /\bfake check|mobile deposit\b/i.test(stripped), 'fake check or mobile deposit request')
    addFlag(flags, /\bwire transfer|crypto|gift cards?\b/i.test(stripped), 'high-risk payment method requested')
    addFlag(flags, /\bwhatsapp|telegram\b/i.test(stripped), 'recruiter moved conversation to messaging app')

    floors.push({
      minScore: 75,
      minRiskLevel: 'high',
      category: 'job_scam_or_ghost_job',
      redFlags: flags.length ? flags : ['hard job-scam indicator found'],
      strongSignalCount: 2
    })
  }

  if (isJob && hasCriticalJobSignal) {
    const flags: string[] = []
    addFlag(flags, equipmentDepositPattern.test(stripped) || /\bdeposit\b/i.test(stripped), 'upfront equipment deposit')
    addFlag(flags, replyQuicklyPattern.test(stripped), 'pressure to reply quickly')
    addFlag(flags, beforeInterviewPattern.test(stripped), 'payment requested before interview')
    addFlag(flags, paymentAppPattern.test(stripped), 'Zelle/payment app request')
    addFlag(flags, /\bbank(ing)? info|bank account|routing number\b/i.test(stripped), 'banking information requested during hiring')
    addFlag(flags, /\bfake check|mobile deposit\b/i.test(stripped), 'fake check or mobile deposit request')
    addFlag(flags, /\bwire transfer|crypto|gift cards?\b/i.test(stripped), 'high-risk payment method requested')

    floors.push({
      minScore: 90,
      minRiskLevel: 'very_high',
      category: 'job_scam_or_ghost_job',
      redFlags: flags.length ? flags : ['critical job-scam payment indicator found'],
      strongSignalCount: 3,
      safeReply:
        'Do not send money or personal information. Verify the company through an official website you find yourself.'
    })
  }

  const hasPhishingFloorSignal =
    phishingFloorSignalPattern.test(stripped) || (urls.length > 0 && /\bverify|login|account|password\b/i.test(stripped))
  if (hasPhishingFloorSignal) {
    floors.push({
      minScore: 75,
      minRiskLevel: 'high',
      category: 'phishing_url',
      redFlags: ['account or login verification pressure'],
      strongSignalCount: 2
    })
  }

  if (panicPattern.test(stripped) && urls.length > 0) {
    floors.push({
      minScore: 75,
      minRiskLevel: 'high',
      category: 'phishing_url',
      redFlags: ['urgent or distressed message includes a link'],
      strongSignalCount: 2,
      summary:
        'Pause before clicking, paying, or replying. This submission includes a link and urgent or distressed language, so verify through an official source you find yourself.'
    })
  }

  if (hasPhishingFloorSignal && criticalPhishingSignalPattern.test(stripped)) {
    floors.push({
      minScore: 90,
      minRiskLevel: 'very_high',
      category: 'phishing_url',
      redFlags: ['sensitive credential or financial information requested'],
      strongSignalCount: 3
    })
  }

  if (sensitiveRequestPattern.test(stripped)) {
    floors.push({
      minScore: 90,
      minRiskLevel: 'very_high',
      category: hasPhishingFloorSignal ? 'phishing_url' : hintCategory ?? 'unknown',
      redFlags: ['sensitive credential or financial information requested'],
      strongSignalCount: 3
    })
  }

  const hasBillContext = billContextPattern.test(stripped)
  const unknownOrUnverified = unknownSenderPattern.test(stripped) || hintCategory === undefined
  // Require an urgency or threat signal alongside the bill context — "invoice" alone
  // on a benign message (freelance, subscription) must not trigger a High floor.
  const hasUrgencyOrThreat =
    /\b(today|immediately|right\s*now|asap|urgent(?:ly)?|final\s*notice|last\s*(?:warning|chance)|collections?|legal\s*action|lawsuit|warrant|suspend(?:ed|ing)?|terminat(?:e|ed|ing)|cancel(?:l?ed|l?ing)?|garnish|penalty|penalties|arrest|prosecut(?:e|ed|ion))\b/i.test(stripped)
  if (hasBillContext && unknownOrUnverified && hasUrgencyOrThreat) {
    floors.push({
      minScore: 75,
      minRiskLevel: 'high',
      category: 'bill_or_fee',
      redFlags: ['urgent bill or payment demand from unverified sender'],
      strongSignalCount: 2
    })
  }

  if ((hasBillContext || unknownOrUnverified) && highRiskPaymentPattern.test(stripped)) {
    floors.push({
      minScore: 90,
      minRiskLevel: 'very_high',
      category: hasBillContext
        ? 'bill_or_fee'
        : isJob
          ? 'job_scam_or_ghost_job'
          : hintCategory ?? 'unknown',
      redFlags: ['payment requested through gift card, crypto, payment app, or wire'],
      strongSignalCount: 3
    })
  }

  if (governmentPattern.test(stripped) && (highRiskPaymentPattern.test(stripped) || governmentThreatPattern.test(stripped))) {
    floors.push({
      minScore: 90,
      minRiskLevel: 'very_high',
      category: 'scam_text',
      redFlags: ['government impersonation threat or payment demand'],
      strongSignalCount: 3
    })
  }

  if (packageLinkPattern.test(stripped) && urls.length > 0 && !/\b(i requested|i signed up|opted in|tracking number i requested)\b/i.test(normalized)) {
    floors.push({
      minScore: 75,
      minRiskLevel: 'high',
      category: 'phishing_url',
      redFlags: ['unsolicited package or delivery link'],
      strongSignalCount: 2
    })
  }

  // ── Romance / relationship + urgent emergency + payment-app request ───────
  // Pattern: someone recently "met"/"matched"/an online "partner"/"boyfriend"
  // claims an emergency and asks for money via a payment app. Classic romance
  // scam. The payment-app request is the hard signal; romance context + an
  // emergency/urgency cue qualify it as a high floor.
  const romanceContextPattern =
    /\b(matched?\s+with|met\s+(?:someone|him|her|them)\s+online|online\s+(?:date|dating|match|relationship)|dating\s+(?:app|site)|tinder|bumble|hinge|boyfriend|girlfriend|fianc[eé]e?|my\s+(?:partner|lover)|soulmate|love\s+interest|romance)\b/i
  const emergencyPattern =
    /\b(emergency|urgent(?:ly)?|right\s*away|immediately|asap|stranded|stuck|hospital|medical\s+bill|customs|detained|in\s+trouble|need\s+(?:help|money|cash)\s+now)\b/i
  const promiseRepayPattern =
    /\b(pay\s+(?:me|you)\s+back|pay\s+back|repay|return\s+the\s+money|wire\s+it\s+back)\b/i
  if (
    romanceContextPattern.test(stripped) &&
    paymentAppPattern.test(stripped) &&
    (emergencyPattern.test(stripped) || promiseRepayPattern.test(stripped))
  ) {
    const flags: string[] = ['romance contact requesting money via a payment app']
    addFlag(flags, emergencyPattern.test(stripped), 'claimed emergency creating urgency')
    addFlag(flags, promiseRepayPattern.test(stripped), 'promise to pay the money back')
    floors.push({
      minScore: 75,
      minRiskLevel: 'high',
      category: hintCategory ?? 'unknown',
      redFlags: flags,
      strongSignalCount: 2
    })
  }

  // ── Advance-fee scam (foreign official / inheritance / "Nigerian prince") ─
  // Pattern: a large sum of money is offered (inheritance, fund transfer,
  // beneficiary, lottery) by an official/dignitary/intermediary, but the
  // recipient must pay an upfront fee or hand over banking details to
  // "release"/"transfer" the funds. Money is required BEFORE you receive
  // anything → classic advance-fee fraud.
  const advanceFeeActorPattern =
    /\b(government\s+official|foreign\s+official|bank\s+officer|barrister|solicitor|prince|princess|king|minister|diplomat|attorney|next\s+of\s+kin|widow|estate\s+(?:agent|lawyer)|consultant)\b/i
  const advanceFeeWealthPattern =
    /\b(inheritance|inherit(?:ed)?|beneficiary|estate|lottery|unclaimed\s+funds?|trunk\s+box|large\s+sum|millions?\s+of\s+dollars?|\$\s?\d[\d,.]*\s*(?:million|billion|m\b)|fund\s+transfer|transfer\s+(?:of\s+)?(?:funds?|money|\$))\b/i
  const advanceFeeFeePattern =
    /\b((?:processing|release|transfer|legal|clearance|handling|insurance|upfront|advance|administrative|admin)\s+fee|upfront\s+(?:fee|payment|cost)|advance\s+fee|pay\s+(?:a\s+)?(?:fee|\$?\d)|small\s+fee|bank(?:ing)?\s+(?:account\s+)?details?)\b/i
  const advanceFeeReleasePattern =
    /\b(release|transfer|unlock|clear|move|send)\b.{0,40}\b(funds?|money|inheritance|millions?|\$)/i
  const hasAdvanceFeeActor = advanceFeeActorPattern.test(stripped)
  const hasAdvanceFeeWealth = advanceFeeWealthPattern.test(stripped)
  const hasAdvanceFeeFee = advanceFeeFeePattern.test(stripped)
  // Require a large-sum/wealth context AND a fee/banking-detail demand, plus at
  // least one of: an official/intermediary actor, or an explicit release/transfer
  // framing. Two of these three pillars must be present so a benign "transfer of
  // funds" sentence with no fee never trips the floor.
  if (
    hasAdvanceFeeWealth &&
    hasAdvanceFeeFee &&
    (hasAdvanceFeeActor || advanceFeeReleasePattern.test(stripped))
  ) {
    const flags: string[] = ['advance-fee scam: fee or bank details required to release a large sum']
    addFlag(flags, hasAdvanceFeeActor, 'foreign official, dignitary, or intermediary as sender')
    addFlag(flags, /\binheritance|inherit|beneficiary|estate|lottery\b/i.test(stripped), 'inheritance, beneficiary, or lottery windfall claim')
    addFlag(flags, /\bbank(?:ing)?\s+(?:account\s+)?details?\b/i.test(stripped), 'request for bank account details')
    floors.push({
      minScore: 90,
      minRiskLevel: 'very_high',
      category: hintCategory ?? 'unknown',
      redFlags: flags,
      strongSignalCount: 3,
      safeReply:
        'Do not send any money or share bank details. Anyone asking for an upfront fee to "release" a large sum is running an advance-fee scam.'
    })
  }

  // ── Investment guarantee scam (guaranteed returns, recruit friends) ───────
  const investmentScamPattern =
    /\bguarantee[ds]?\s+(?:\d+%\s+)?(?:returns?|profits?|earnings?|income|monthly)\b|\b\d{2,3}%\s+(?:returns?|per\s+month|monthly)\b|\brecruit\s+(?:friends?|others?|people|members?)\b.{0,40}\b(?:bonus|commission|reward)\b|\bpig\s+butchering\b/i
  if (investmentScamPattern.test(stripped)) {
    floors.push({
      minScore: 40,
      minRiskLevel: 'medium',
      category: hintCategory ?? 'unknown',
      redFlags: ['investment platform promises guaranteed returns or MLM-style recruiting'],
      strongSignalCount: 1
    })
  }

  // ── Withdrawal-fee / deposit-to-unlock trap ──────────────────────────────
  const withdrawalFeePattern =
    /\b(?:withdraw|withdrawal|cash\s*out).{0,80}\b(?:deposit|fee|tax|payment|first|before|unlock|pay(?:ing|ment)?)\b|\b(?:deposit|fee|tax).{0,60}\b(?:unlock|release|withdraw|access|cash\s*out)\b/i
  if (
    withdrawalFeePattern.test(stripped) &&
    (/\b(?:balance|earnings?|profits?|funds?|savings?)\b/i.test(stripped) ||
      highRiskPaymentPattern.test(stripped))
  ) {
    floors.push({
      minScore: 75,
      minRiskLevel: 'high',
      category: hintCategory ?? 'unknown',
      redFlags: ['withdrawal blocked until more deposit paid (advance-fee trap)'],
      strongSignalCount: 2
    })
  }

  // ── Tech-support / fake virus pop-up scam ────────────────────────────────
  const techSupportScamPattern =
    /\b(?:pop[-\s]?up|virus\s*(?:alert|detected|found|warning)|malware\s*(?:detected|found)|computer\s*(?:infected|hacked|compromised|virus)).{0,120}\b(?:call|phone|contact|1[-\s]?800)\b|\b(?:remote\s*(?:access|desktop|control)).{0,60}\b(?:payment|pay|fee)\b/i
  if (techSupportScamPattern.test(stripped)) {
    floors.push({
      minScore: 75,
      minRiskLevel: 'high',
      category: 'phishing_url',
      redFlags: ['tech support scam: fake virus warning with call number or remote-access payment demand'],
      strongSignalCount: 2
    })
  }

  if (promptInjectionPattern.test(normalized)) {
    floors.push({
      minScore: 25,
      minRiskLevel: 'medium',
      category: hintCategory ?? 'unknown',
      redFlags: ['prompt-injection instruction inside submitted content'],
      strongSignalCount: 1,
      summary:
        'The submitted text includes an instruction that tries to override Ray. Ray ignored that instruction and analyzed only the risk signals in the content.'
    })
  }

  return mergeFloors(floors)
}

export function riskLevelForFlooredScore(score: number, floor?: RiskFloorResult | null): RiskLevel {
  if (floor?.minRiskLevel === 'needs_more_info') return 'needs_more_info'
  return getRiskLevel(score)
}
