'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

import { LegalDisclaimer } from '@/components/legal-disclaimer'
import { RiskReport, type RiskReportData } from '@/components/risk-report'
import { SaveResultPrompt } from '@/components/checkmate/SaveResultPrompt'
import { IconArrowRight, IconSpinner } from '@/components/ui/icons'
import type { CaseCategory, RiskLevel } from '@/lib/checkmate-shared'
import type { AccessStatus } from '@/lib/billing/access'

/**
 * Category picker options shown above the text box. Each option maps to
 * a `category_hint` value that the analyzer already accepts (defined in
 * `lib/checkmate-shared.ts caseCategories` + the API route schema).
 *
 * Adding a fresh hint here without an existing backend mapping would
 * silently get dropped by the API's zod validator, so we re-use the
 * canonical values and only diverge in the user-facing label. Two UI
 * options (Job offer, Ghost job listing) deliberately map to the same
 * backend hint `job_scam_or_ghost_job` — surfacing them as separate
 * choices in the picker is a research-backed positioning play (job
 * scams are the strongest wedge) without splitting analyzer logic.
 *
 * The `icon` is a plain glyph rendered alongside the label so the
 * picker reads at a glance even on small screens.
 */
interface CategoryOption {
  /** Stable id used as the React key and for the highlighted state. */
  id: string
  /** Backend analyzer hint — must be one of the existing accepted values. */
  hint: CaseCategory | ''
  label: string
  icon: string
  /** Optional short subtitle shown on hover / focus. */
  blurb?: string
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: 'auto',
    hint: '',
    label: 'Not sure',
    icon: '✨',
    blurb: 'Let Ray pick the category for you.'
  },
  {
    id: 'job_offer',
    hint: 'job_scam_or_ghost_job',
    label: 'Job offer / recruiter',
    icon: '💼',
    blurb: 'Recruiter texts, DMs, or job offers that look off.'
  },
  {
    id: 'ghost_job',
    hint: 'job_scam_or_ghost_job',
    label: 'Ghost job listing',
    icon: '👻',
    blurb: 'Listings that look real but never lead anywhere.'
  },
  {
    id: 'suspicious_text',
    hint: 'scam_text',
    label: 'Suspicious text',
    icon: '💬',
    blurb: 'SMS or chat from an unknown sender.'
  },
  {
    id: 'phishing_link',
    hint: 'phishing_url',
    label: 'Phishing link',
    icon: '🔗',
    blurb: 'Suspicious URL pretending to be a real site.'
  },
  {
    id: 'bill_or_fee',
    hint: 'bill_or_fee',
    label: 'Bill or payment request',
    icon: '💳',
    blurb: 'Unexpected invoices, fees, or money requests.'
  },
  {
    id: 'marketplace',
    hint: 'rental_or_marketplace',
    label: 'Marketplace / rental',
    icon: '🏠',
    blurb: 'Listings on FB Marketplace, Craigslist, Zillow, etc.'
  },
  {
    id: 'bank_or_govt',
    // Backend mapping note: "Bank or government notice" doesn't have a
    // dedicated category in the schema yet (would need a migration), so
    // we send `scam_text` — closest existing hint that prompts the
    // analyzer for impersonation cues. The user-facing label stays
    // accurate.
    hint: 'scam_text',
    label: 'Bank or gov notice',
    icon: '🏛️',
    blurb: 'IRS, USPS, bank, or "official" messages.'
  },
  {
    id: 'other',
    hint: '',
    label: 'Other',
    icon: '🤔',
    blurb: 'Something else — Ray will figure it out.'
  }
]

/**
 * Visible-in-the-UI options that should trigger the job-specific
 * helper card (educational hint + red-flag examples).
 */
const JOB_OPTION_IDS = new Set(['job_offer', 'ghost_job'])

interface AnalysisResult extends RiskReportData {
  saved: boolean
  case_id?: string
}

export function NewCaseForm() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  // `selectedOptionId` drives the highlighted-button UX; `categoryHint`
  // is the backend value we send. They're kept in sync via `pickOption`.
  // Default to 'auto' so the picker has a visible selection on first
  // render — the API treats empty `hint` the same as if nothing was sent.
  const [selectedOptionId, setSelectedOptionId] = useState<string>('auto')
  const [categoryHint, setCategoryHint] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function pickOption(option: CategoryOption) {
    setSelectedOptionId(option.id)
    setCategoryHint(option.hint)
  }

  const isJobSelected = JOB_OPTION_IDS.has(selectedOptionId)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [blockedReason, setBlockedReason] = useState<{
    message: string
    status: AccessStatus
    plan: string | null
  } | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setResult(null)

    try {
      const trimmedUrl = url.trim()
      const response = await fetch('/api/analyze-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_text: text,
          ...(trimmedUrl ? { input_url: trimmedUrl } : {}),
          ...(categoryHint ? { category_hint: categoryHint } : {})
        })
      })

      const payload = await response.json()

      // Access blocked — show inline gate instead of toast
      if (response.status === 402) {
        setBlockedReason({
          message: payload.message ?? 'Access limit reached.',
          status: (payload.access?.accessStatus ?? 'blocked') as AccessStatus,
          plan:
            typeof payload.access?.plan === 'string'
              ? payload.access.plan
              : null
        })
        return
      }

      if (!response.ok) throw new Error(payload.message ?? payload.error ?? 'Analysis failed')

      const r = payload.report
      setResult({
        saved: Boolean(payload.saved),
        category: r.category as CaseCategory,
        risk_score: r.risk_score as number,
        risk_level: r.risk_level as RiskLevel,
        confidence_level: r.confidence_level as 'low' | 'medium' | 'high' | undefined,
        summary: r.summary as string,
        evidence_found: r.evidence_found as string[] | undefined,
        red_flags: r.red_flags as string[],
        missing_information: r.missing_information as string[] | undefined,
        recommended_actions: r.recommended_actions as string[],
        verification_steps: r.verification_steps as string[] | undefined,
        safe_reply: r.safe_reply as string,
        disclaimer: r.disclaimer as string,
        case_id: payload.case_id as string | undefined
      })

      // Refresh server components so dashboard updates immediately
      if (payload.saved) router.refresh()

      setTimeout(() => {
        document.getElementById('risk-report-result')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      }, 100)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Analysis failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  function onReset() {
    setResult(null)
    setBlockedReason(null)
    setText('')
    setUrl('')
    setCategoryHint('')
  }

  return (
    <div className="space-y-8">
      {/* Blocked gate — shown when 402 is returned mid-session */}
      {blockedReason && (() => {
        const isAnon = blockedReason.status === 'anonymous_used'
        const isFreeOverLimit =
          blockedReason.status === 'expired' && blockedReason.plan === 'free'
        const icon = isAnon ? '🔒' : isFreeOverLimit ? '📅' : '⏰'
        const title = isAnon
          ? "You've used your free check"
          : isFreeOverLimit
            ? "You've used your free check this month"
            : 'Your trial has ended'
        return (
        <div className="flex flex-col items-center gap-5 py-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-2xl">
            {icon}
          </div>
          <div>
            <p className="text-base font-medium text-white">{title}</p>
            <p className="mt-1 text-sm text-white/50">{blockedReason.message}</p>
          </div>
          {isAnon ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cm-green px-6 py-3 text-sm font-medium text-cm-bg transition hover:bg-cm-green/90"
              >
                Create free account
              </a>
              <a
                href="/sign-in"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-3 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white"
              >
                Sign in
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cm-green px-6 py-3 text-sm font-medium text-cm-bg transition hover:bg-cm-green/90"
              >
                View plans
              </a>
            </div>
          )}
        </div>
        )
      })()}

      {/* Input form — hidden once a result or block is showing */}
      {!result && !blockedReason && (
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="case-text"
              className="text-sm font-medium text-white/80"
            >
              What do you want Ray to check?
            </label>
            <textarea
              id="case-text"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste a suspicious text, email, link, bill, job post, recruiter message, or marketplace message…"
              rows={8}
              maxLength={10000}
              className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cm-green/40 focus:ring-2 focus:ring-cm-green/20"
            />
            {text.length > 8000 && (
              <p className="mt-1 text-right text-[11px] text-white/30">
                {text.length.toLocaleString()} / 10,000 characters
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="case-url"
              className="text-sm font-medium text-white/80"
            >
              Suspicious link{' '}
              <span className="font-normal text-white/30">(optional)</span>
            </label>
            <input
              id="case-url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com/suspicious-link"
              type="url"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cm-green/40 focus:ring-2 focus:ring-cm-green/20"
            />
          </div>

          {/* Category picker. Visual button-grid replaces the previous
              <select> so the categories that matter (job scams in
              particular — strongest wedge per market research) are
              first-class and one tap away. Each button maps to an
              existing analyzer category_hint; new UI categories that
              don't have a dedicated backend value reuse the closest
              existing hint to avoid breaking the analyzer schema. */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-white/80">
              What kind of thing should Ray check?{' '}
              <span className="font-normal text-white/30">(optional)</span>
            </legend>
            <div
              role="radiogroup"
              aria-label="Check category"
              className="grid grid-cols-2 gap-2 sm:grid-cols-3"
            >
              {CATEGORY_OPTIONS.map(option => {
                const isActive = option.id === selectedOptionId
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => pickOption(option)}
                    title={option.blurb}
                    className={[
                      'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-cm-green/40',
                      isActive
                        ? 'border-cm-green/45 bg-cm-green/8 text-white shadow-[0_0_18px_rgba(122,226,207,0.12)]'
                        : 'border-white/10 bg-white/[0.03] text-white/65 hover:border-white/25 hover:bg-white/[0.06] hover:text-white'
                    ].join(' ')}
                  >
                    <span className="text-base leading-none" aria-hidden>
                      {option.icon}
                    </span>
                    <span className="truncate">{option.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Job / ghost-job educational panel. Surfaces when either
                of the two job-related UI options is selected. Pure
                copy — does not change the analyzer call. */}
            {isJobSelected && (
              <div className="mt-3 rounded-xl border border-cm-green/25 bg-cm-green/[0.04] p-4">
                <p className="text-sm font-medium text-white">
                  Check a job offer or recruiter message
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white/55">
                  Paste the recruiter text, job listing, email, or offer.
                  Ray checks for fake-recruiter patterns, ghost-job signals,
                  equipment-payment scams, and risky hiring language.
                </p>

                <p className="mt-3 text-[11px] font-medium uppercase tracking-wider text-cm-green/85">
                  Common red flags
                </p>
                <ul className="mt-1.5 grid grid-cols-1 gap-1 text-xs text-white/55 sm:grid-cols-2">
                  {[
                    'Recruiter only texts',
                    'Asked to reply "YES" or "INTERESTED"',
                    'Equipment deposit or fake check',
                    'Vague company details',
                    'High pay, low detail',
                    'Pressure to act today'
                  ].map(flag => (
                    <li
                      key={flag}
                      className="flex items-start gap-1.5 leading-snug"
                    >
                      <span className="mt-1 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-cm-green/55" />
                      {flag}
                    </li>
                  ))}
                </ul>

                <p className="mt-3 rounded-lg border border-white/8 bg-black/20 px-3 py-2 text-[11px] leading-relaxed text-white/55">
                  Don&apos;t ignore a real opportunity. Don&apos;t walk into
                  a fake one. Verify the company, recruiter, domain, and
                  payment requests through official channels.
                </p>
              </div>
            )}
          </fieldset>

          <div className="flex flex-col gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="submit"
              disabled={isSubmitting || (!text.trim() && !url.trim())}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cm-green px-6 py-3 text-sm font-medium text-cm-bg shadow-[0_0_24px_rgba(122,226,207,0.3)] transition-all hover:bg-cm-green/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? (
                <>
                  <IconSpinner className="h-4 w-4 animate-spin" />
                  Ray is checking for common red flags…
                </>
              ) : (
                <>
                  <IconArrowRight className="h-4 w-4" />
                  Ask Ray
                </>
              )}
            </button>
          </div>

          <LegalDisclaimer variant="compact" />
        </form>
      )}

      {/* Results */}
      {result && (
        <div id="risk-report-result" className="space-y-5">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Ray&apos;s report</h2>
            <div className="flex gap-2">
              <button
                onClick={onReset}
                type="button"
                className="inline-flex items-center rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/40 hover:text-white"
              >
                Check another
              </button>
              {result.saved && result.case_id && (
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="inline-flex items-center rounded-lg border border-cm-green/30 px-3 py-1.5 text-xs font-medium text-cm-green transition hover:border-cm-green/60"
                >
                  Dashboard
                </button>
              )}
            </div>
          </div>

          {/* Report card */}
          <RiskReport report={result} />

          {/* Saved indicator for authenticated users */}
          {result.saved && result.case_id && (
            <p className="text-center text-xs text-white/40">
              ✓ Saved to your account.{' '}
              <a
                href={`/cases/${result.case_id}`}
                className="text-cm-green underline underline-offset-2 hover:text-cm-green/80"
              >
                view full case page
              </a>
            </p>
          )}

          {/* Guest prompt — shown when analysis ran but wasn't persisted */}
          {!result.saved && (
            <SaveResultPrompt returnPath="/cases/new" />
          )}
        </div>
      )}
    </div>
  )
}
