import {
  caseCategories,
  getRiskLevel,
  type CaseCategory,
  type RiskLevel
} from '@/lib/checkmate-shared'
import { matchScamIntel } from '@/lib/analyzer/scam-intel-catalog'

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

// ── Official-listing positive evidence ───────────────────────────────────────
// Phrases that indicate the post lives on an official company careers page or a
// reputable applicant-tracking system (ATS) the company links from its own site.
const officialListingPattern =
  /\bofficial\s+(?:careers?\s+(?:page|site|website|portal)|company\s+(?:website|careers?\s+(?:page|site))|job\s+board|application\s+(?:form|portal|link)|apply\s+link)\b|\bcompany'?s?\s+official\s+careers?\s+(?:page|site|portal)\b|\bofficial\s+careers?\s+site\b/i
// Reputable ATS hosts. Matched against text OR a detected URL host.
const atsListingPattern =
  /\b(greenhouse|lever|ashby|workday|smartrecruiters|icims|taleo|jobvite)\b/i
// "not on / can't find … official careers" — a NEGATED reference to the official
// page is a ghost-job signal, NOT positive official-listing evidence.
const negatedOfficialPattern =
  /\b(?:not|isn'?t|is\s+not|are\s+not|aren'?t|cannot|can'?t|could\s*n'?t|won'?t|never|no(?:t)?\s+(?:longer|where))\b(?:\s+\w+){0,5}\s+official\s+careers?/i

// ── Ghost-job (suspicious-but-not-criminal) signals ──────────────────────────
const ghostJobSignalPatterns: RegExp[] = [
  /\b(?:re-?post(?:ed|ing)?|reposted)\b|\bbeen\s+(?:up|open|live|listed|posted)\s+for\s+(?:weeks|months)\b|\b(?:open|listed|posted)\s+for\s+months\b/i,
  /\b(?:not|isn'?t|is\s+not|cannot|can'?t|could\s*n'?t)\b(?:\s+\w+){0,5}\s+official\s+careers?/i,
  /\bunverified\s+recruiter\b|\brecruiter\s+(?:is\s+)?(?:not\s+verified|unverified)\b|\b(?:can'?t|cannot|could\s*n'?t)\s+verify\s+(?:the\s+)?recruiter\b/i,
  /\b(?:generic|vague|copy[-\s]?paste[d]?|boilerplate|templated)\b(?:\s+\w+){0,3}\s*(?:description|posting|listing|job\s+ad)\b|\b(?:description|posting|listing)\s+is\s+(?:generic|vague|boilerplate)\b/i,
  /\bno\s+(?:clear\s+)?(?:hiring\s+)?timeline\b|\bno\s+(?:interview|start)\s+(?:date|timeline)\b|\bno\s+clear\s+next\s+steps?\b/i,
  /\b(?:many|hundreds\s+of|thousands\s+of|lots\s+of|tons\s+of|countless)\s+applicants\b|\b(?:flooded|swamped)\s+with\s+applicants\b/i
]

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

  // Pass 0 — flatten multi-line / bulleted list formatting so a negated safety
  // disclaimer that spans several lines or bullet points reads as ONE inline
  // sentence. Without this, Pass 1's `[^.!?\n]+` terminator stops at the first
  // newline, leaving bulleted scam terms ("- Zelle", "- banking info")
  // un-negated. That was the live production bug: official OpenAI/Anthropic
  // listings whose "it does not ask for …" disclaimer was a bulleted list
  // scored Critical because every list item tripped a floor.
  let result = text
    // Drop leading list bullets / numbering at the start of each line.
    .replace(/(^|\n)[ \t]*(?:[-*•·–—]|\d+[.)])\s+/g, '$1')
    // Blank-line paragraph breaks become a sentence stop so a negation pass
    // cannot bleed across unrelated paragraphs.
    .replace(/\n[ \t]*\n+/g, ' . ')
    // Remaining single newlines inside a block become comma separators so a
    // colon-led list ("does not ask for:\nmoney\ncrypto") joins inline and the
    // whole list falls inside one negation span.
    .replace(/\n+/g, ', ')
    // Tidy the "header:," artifact produced by the join above.
    .replace(/:\s*,\s*/g, ': ')

  // Pass 1 — "[negation] ask (me/you) for [list until sentence end]"
  // Handles: "not asked me for money, gifts, crypto, or any investment"
  //          "will never ask for money, fees, or banking information"
  //          "legitimate recruiters never ask for payment or banking info"
  //          "they do not request money, gift cards, or SSN before an offer"
  // The trailing [^.!?\n]+ swallows the WHOLE comma/"or"-separated list so a
  // later item ("banking information", "SSN") can't survive the negation just
  // because an intervening word ("fees") isn't a recognised scam term.
  // The `(?:\s+\w+){0,3}` allows a few filler words between the negation and the
  // ask-verb so phrasings like "No one has asked for …", "they will never
  // directly ask for …", "the company does not ever request …" are caught and
  // the WHOLE trailing comma/"or" list is stripped to the sentence end.
  result = result.replace(
    /\b(?:not|never|no|didn?'?t|doesn?'?t|don?'?t|hasn?'?t|haven?'?t|won'?t|wont|do\s+not|did\s+not|does\s+not|will\s+(?:not|never)|would\s+(?:not|never))(?:\s+\w+){0,3}\s+(?:ask|asks|asked|asking|request|requests|requested|requesting|require|requires|required|demand|demands)(?:\s+(?:me|you|us|anyone|for|that))*\s+[^.!?\n]+/gi,
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

/**
 * True when the submission describes an official company careers page or a
 * reputable ATS host (Greenhouse, Lever, etc.) — positive evidence the listing
 * is real. A NEGATED reference ("not on the official careers page", "can't find
 * it on their careers site") does NOT count as official-listing evidence.
 */
export function detectOfficialListing(text: string, urls: string[]): boolean {
  const lower = text.toLowerCase()
  if (negatedOfficialPattern.test(lower)) {
    // A negated official-careers reference disqualifies the text phrasing, but
    // an ATS host in the URL/text is still hard positive evidence.
    return atsListingPattern.test(lower) || urls.some(u => atsListingPattern.test(u))
  }
  if (officialListingPattern.test(lower)) return true
  if (atsListingPattern.test(lower)) return true
  if (urls.some(u => atsListingPattern.test(u))) return true
  // Company's own domain careers path, e.g. openai.com/careers, anthropic.com/jobs
  if (urls.some(u => /\/(careers?|jobs?|join|work-with-us|opportunities)\b/i.test(u))) return true
  return false
}

/**
 * True when the sender is ACTUALLY asking for money, payment, sensitive
 * credentials, or off-platform messaging — i.e. an active scam request, not a
 * mention of risk words inside a safety disclaimer. Runs on negation-stripped
 * text so "never asks for banking info" does NOT count as an active request.
 */
export function hasActiveScamRequest(text: string, urls: string[]): boolean {
  const stripped = buildNegationStrippedText(text).toLowerCase()
  return (
    jobFloorSignalPattern.test(stripped) ||
    criticalJobSignalPattern.test(stripped) ||
    sensitiveRequestPattern.test(stripped) ||
    highRiskPaymentPattern.test(stripped) ||
    equipmentDepositPattern.test(stripped) ||
    (phishingFloorSignalPattern.test(stripped) && criticalPhishingSignalPattern.test(stripped))
  )
}

/**
 * Safe-harbor test: the submission is an official listing, there is NO active
 * scam request, and no deterministic floor of medium+ severity fired. When true,
 * callers should CAP the risk score into the Low band — an AI over-score (the
 * production bug where official OpenAI/Anthropic listings were marked
 * High/Critical) gets corrected here.
 */
export function isOfficialListingSafe(
  text: string,
  urls: string[],
  floor?: RiskFloorResult | null
): boolean {
  if (!detectOfficialListing(text, urls)) return false
  // The ACTIVE-request check is the real safety gate. A genuine scam that
  // claims an official listing AND makes an active money/credential request
  // (e.g. "official OpenAI role — send a $250 Zelle deposit") returns true here
  // and is NOT capped. Anything else is only mentioning/negating scam terms.
  if (hasActiveScamRequest(text, urls)) return false
  // IMPORTANT: do NOT veto on a high payment/credential floor. Those floors are
  // exactly the false positives we are correcting — they fire on negated
  // disclaimer mentions, and `hasActiveScamRequest` (run on the same
  // negation-stripped text) has already confirmed there is no real request.
  // Only let a genuine ghost-job MEDIUM floor stand, so a flagged ghost job is
  // not silently capped to Low.
  if (
    floor &&
    floor.category === 'job_scam_or_ghost_job' &&
    floor.minRiskLevel === 'medium' &&
    floor.minScore < 60
  ) {
    return false
  }
  return true
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

  // ── Ghost-job / suspicious-but-not-criminal middle lane ──────────────────
  // A posting that shows ≥2 ghost-job signals (reposted for months, generic
  // boilerplate, unverified recruiter, no hiring timeline, flooded with
  // applicants, or "not on the official careers page") but makes NO active
  // scam request is uncertain, not criminal. Floor it into Medium so it reads
  // as "verify before investing time" rather than Low or Critical.
  const ghostSignalCount = ghostJobSignalPatterns.reduce(
    (n, re) => (re.test(normalized) ? n + 1 : n),
    0
  )
  if (
    isJob &&
    ghostSignalCount >= 2 &&
    !hasJobFloorSignal &&
    !hasCriticalJobSignal &&
    !hasActiveScamRequest(text, urls)
  ) {
    floors.push({
      minScore: 45,
      minRiskLevel: 'medium',
      category: 'job_scam_or_ghost_job',
      redFlags: ['ghost-job signals: posting may not be actively hiring — verify before investing time'],
      strongSignalCount: 1,
      summary:
        'This posting shows ghost-job warning signs (such as being reposted for a long time, vague boilerplate, an unverified recruiter, or no clear hiring timeline). It is not necessarily a scam, but verify the role is active through the company’s official careers page before investing time.'
    })
  }

  // An official listing with no active credential/payment request must not trip
  // the weak URL-based phishing branch (this produced the false "account or
  // login verification pressure" flag on the Anthropic Greenhouse listing).
  const officialSafe = detectOfficialListing(text, urls) && !hasActiveScamRequest(text, urls)
  const hasPhishingFloorSignal =
    phishingFloorSignalPattern.test(stripped) ||
    (!officialSafe && urls.length > 0 && /\bverify|login|account|password\b/i.test(stripped))
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

  // ── Curated scam-intelligence catalog (raise-only) ───────────────────────────
  // Matches the submission against the in-code catalog
  // (lib/analyzer/scam-intel-catalog.ts). Critical is gated to concrete danger
  // evidence inside the matcher — weak matches arrive here as Medium ("needs
  // verification"), never very_high. This is a floor: it can only RAISE the
  // score via mergeFloors, never lower it.
  const intelMatch = matchScamIntel({
    strippedText: stripped,
    normalizedText: normalized,
    urls
  })
  if (intelMatch) {
    floors.push({
      minScore: intelMatch.minScore,
      minRiskLevel: intelMatch.minRiskLevel,
      category: intelMatch.category,
      redFlags: [intelMatch.redFlag],
      strongSignalCount: intelMatch.strongSignalCount,
      summary: intelMatch.downgraded
        ? `This resembles a known scam pattern (${intelMatch.pattern.name.replace(/_/g, ' ')}), but the evidence is incomplete. Verify the sender and any links through official channels before acting.`
        : undefined
    })
  }

  return mergeFloors(floors)
}

export function riskLevelForFlooredScore(score: number, floor?: RiskFloorResult | null): RiskLevel {
  if (floor?.minRiskLevel === 'needs_more_info') return 'needs_more_info'
  return getRiskLevel(score)
}
