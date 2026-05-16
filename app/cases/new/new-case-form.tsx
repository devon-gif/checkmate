'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

import { LegalDisclaimer } from '@/components/legal-disclaimer'
import { RiskReport, type RiskReportData } from '@/components/risk-report'
import { SaveResultPrompt } from '@/components/checkmate/SaveResultPrompt'
import { IconArrowRight, IconSpinner } from '@/components/ui/icons'
import type { CaseCategory, RiskLevel } from '@/lib/checkmate-shared'

const CATEGORIES: { value: CaseCategory | ''; label: string }[] = [
  { value: '', label: 'Not sure - let CheckRay decide' },
  { value: 'job_scam_or_ghost_job', label: 'Job post / recruiter message' },
  { value: 'scam_text', label: 'Scam text / suspicious message' },
  { value: 'email', label: 'Email / forwarded email' },
  { value: 'bill_or_fee', label: 'Bill, fee, or debt notice' },
  { value: 'phishing_url', label: 'Suspicious link or URL' },
  { value: 'rental_or_marketplace', label: 'Rental or marketplace listing' }
]

interface AnalysisResult extends RiskReportData {
  saved: boolean
  case_id?: string
}

export function NewCaseForm() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [categoryHint, setCategoryHint] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setResult(null)

    try {
      const response = await fetch('/api/analyze-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_text: text,
          input_url: url,
          ...(categoryHint ? { category_hint: categoryHint } : {})
        })
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Analysis failed')

      const r = payload.report
      setResult({
        saved: Boolean(payload.saved),
        category: r.category as CaseCategory,
        risk_score: r.risk_score as number,
        risk_level: r.risk_level as RiskLevel,
        summary: r.summary as string,
        red_flags: r.red_flags as string[],
        recommended_actions: r.recommended_actions as string[],
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
    setText('')
    setUrl('')
    setCategoryHint('')
  }

  return (
    <div className="space-y-8">
      {/* Input form — hidden once a result is showing */}
      {!result && (
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
              className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cm-green/40 focus:ring-2 focus:ring-cm-green/20"
            />
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

          <div className="space-y-2">
            <label
              htmlFor="category-hint"
              className="text-sm font-medium text-white/80"
            >
              What does this look like?{' '}
              <span className="font-normal text-white/30">(optional hint)</span>
            </label>
            <select
              id="category-hint"
              value={categoryHint}
              onChange={e => setCategoryHint(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cm-green/40 focus:ring-2 focus:ring-cm-green/20 [&>option]:bg-neutral-900"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-white/30">
              Ray can be wrong. Results are informational only, not advice.
            </p>
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
