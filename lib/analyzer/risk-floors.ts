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
  /\b(equipment deposit|upfront payment|send money|pay a fee|fake check|mobile deposit|zelle|cash\s*app|venmo|wire transfer|crypto|bitcoin|ethereum|usdt|gift cards?|before the interview|before interview|whatsapp|telegram)\b|\breply\s+["']?(yes|interested)["']?\b/i
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
  /\b(usps|postal service|package|parcel|delivery|tracking|address incomplete|redelivery)\b/i
const promptInjectionPattern =
  /\b(ignore (previous|prior|all) instructions|disregard instructions|you are now|act as|print your prompt|reveal your system prompt|say (this is )?safe|do not mention scam)\b/i
const panicPattern =
  /\b(i'?m scared|i am scared|i'?m panicking|panic|terrified|freaking out|afraid|worried|urgent|help me|what do i do)\b/i
const ventingOnlyPattern =
  /\b(fuck|fucking|shit|bullshit|damn|wtf|angry|mad|pissed|annoyed|frustrated|this sucks|hate this)\b/i

const profanityOnlyPattern =
  /^\s*(?:fuck|shit|damn|bitch|asshole|idiot|stupid|wtf|f u|f\*+|s\*+|a\*+|[@#!$%*\s])+\s*$/i
const tooLittleLettersPattern = /^[^a-z0-9]+$/i
const consonantRunPattern = /^[bcdfghjklmnpqrstvwxyz]{8,}$/i

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
    jobContextPattern.test(normalized) ||
    hintCategory === 'job_scam_or_ghost_job' ||
    (impliedJobEquipmentPattern.test(normalized) &&
      (criticalJobSignalPattern.test(normalized) || beforeInterviewPattern.test(normalized)))
  const hasJobFloorSignal = jobFloorSignalPattern.test(normalized)
  const hasCriticalJobSignal = criticalJobSignalPattern.test(normalized)

  if (isJob && hasJobFloorSignal) {
    const flags: string[] = []
    addFlag(flags, equipmentDepositPattern.test(normalized), 'upfront equipment deposit')
    addFlag(flags, replyQuicklyPattern.test(normalized), 'pressure to reply quickly')
    addFlag(flags, beforeInterviewPattern.test(normalized), 'payment requested before interview')
    addFlag(flags, paymentAppPattern.test(normalized), 'Zelle/payment app request')
    addFlag(flags, /\bfake check|mobile deposit\b/i.test(normalized), 'fake check or mobile deposit request')
    addFlag(flags, /\bwire transfer|crypto|gift cards?\b/i.test(normalized), 'high-risk payment method requested')
    addFlag(flags, /\bwhatsapp|telegram\b/i.test(normalized), 'recruiter moved conversation to messaging app')

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
    addFlag(flags, equipmentDepositPattern.test(normalized) || /\bdeposit\b/i.test(normalized), 'upfront equipment deposit')
    addFlag(flags, replyQuicklyPattern.test(normalized), 'pressure to reply quickly')
    addFlag(flags, beforeInterviewPattern.test(normalized), 'payment requested before interview')
    addFlag(flags, paymentAppPattern.test(normalized), 'Zelle/payment app request')
    addFlag(flags, /\bbank(ing)? info|bank account|routing number\b/i.test(normalized), 'banking information requested during hiring')
    addFlag(flags, /\bfake check|mobile deposit\b/i.test(normalized), 'fake check or mobile deposit request')
    addFlag(flags, /\bwire transfer|crypto|gift cards?\b/i.test(normalized), 'high-risk payment method requested')

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
    phishingFloorSignalPattern.test(normalized) || (urls.length > 0 && /\bverify|login|account|password\b/i.test(normalized))
  if (hasPhishingFloorSignal) {
    floors.push({
      minScore: 75,
      minRiskLevel: 'high',
      category: 'phishing_url',
      redFlags: ['account or login verification pressure'],
      strongSignalCount: 2
    })
  }

  if (panicPattern.test(normalized) && urls.length > 0) {
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

  if (hasPhishingFloorSignal && criticalPhishingSignalPattern.test(normalized)) {
    floors.push({
      minScore: 90,
      minRiskLevel: 'very_high',
      category: 'phishing_url',
      redFlags: ['sensitive credential or financial information requested'],
      strongSignalCount: 3
    })
  }

  if (sensitiveRequestPattern.test(normalized)) {
    floors.push({
      minScore: 90,
      minRiskLevel: 'very_high',
      category: hasPhishingFloorSignal ? 'phishing_url' : hintCategory ?? 'unknown',
      redFlags: ['sensitive credential or financial information requested'],
      strongSignalCount: 3
    })
  }

  const hasBillContext = billContextPattern.test(normalized)
  const unknownOrUnverified = unknownSenderPattern.test(normalized) || hintCategory === undefined
  if (hasBillContext && unknownOrUnverified) {
    floors.push({
      minScore: 75,
      minRiskLevel: 'high',
      category: 'bill_or_fee',
      redFlags: ['urgent bill or payment demand from unverified sender'],
      strongSignalCount: 2
    })
  }

  if ((hasBillContext || unknownOrUnverified) && highRiskPaymentPattern.test(normalized)) {
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

  if (governmentPattern.test(normalized) && (highRiskPaymentPattern.test(normalized) || governmentThreatPattern.test(normalized))) {
    floors.push({
      minScore: 90,
      minRiskLevel: 'very_high',
      category: 'scam_text',
      redFlags: ['government impersonation threat or payment demand'],
      strongSignalCount: 3
    })
  }

  if (packageLinkPattern.test(normalized) && urls.length > 0 && !/\b(i requested|i signed up|opted in|tracking number i requested)\b/i.test(normalized)) {
    floors.push({
      minScore: 75,
      minRiskLevel: 'high',
      category: 'phishing_url',
      redFlags: ['unsolicited package or delivery link'],
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
