'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { LegalDisclaimer } from '@/components/legal-disclaimer'
import { RiskReport, type RiskReportData } from '@/components/risk-report'
import { SaveResultPrompt } from '@/components/checkmate/SaveResultPrompt'
import { IconArrowRight, IconSpinner } from '@/components/ui/icons'
import type { CaseCategory, RiskLevel } from '@/lib/checkmate'

const CATEGORIES: { value: CaseCategory | ''; label: string }[] = [
  { value: '', label: 'Not sure — let CheckMate decide' },
  { value: 'scam_text', label: 'Scam text / suspicious message' },
  { value: 'job_scam_or_ghost_job', label: 'Job offer / recruiter message' },
  { value: 'bill_or_fee', label: 'Bill, fee, or debt notice' },
  { value: 'phishing_url', label: 'Suspicious link or URL' },
  { value: 'rental_or_marketplace', label: 'Rental or marketplace listing' }
]

interface AnalysisResult extends RiskReportData {
  saved: boolean
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

      setResult({
        saved: Boolean(payload.saved),
        category: payload.category as CaseCategory,
        risk_score: payload.risk_score as number,
        risk_level: payload.risk_level as RiskLevel,
        summary: payload.summary as string,
        red_flags: payload.red_flags as string[],
        recommended_actions: payload.recommended_actions as string[],
        safe_reply: payload.safe_reply as string,
        disclaimer: payload.disclaimer as string,
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
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="case-text" className="text-sm font-medium">
              Paste suspicious text
            </label>
            <Textarea
              id="case-text"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste a text message, email, bill notice, job offer, rental listing, or marketplace conversation…"
              className="min-h-[220px] resize-y bg-background"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="case-url" className="text-sm font-medium">
              URL{' '}
              <span className="text-xs text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="case-url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com/suspicious-link"
              type="url"
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="category-hint" className="text-sm font-medium">
              What does this look like?{' '}
              <span className="text-xs text-muted-foreground">
                (optional hint)
              </span>
            </label>
            <select
              id="category-hint"
              value={categoryHint}
              onChange={e => setCategoryHint(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || (!text.trim() && !url.trim())}
            >
              {isSubmitting ? (
                <IconSpinner className="mr-2" />
              ) : (
                <IconArrowRight className="mr-2" />
              )}
              {isSubmitting ? 'Analyzing…' : 'Analyze case'}
            </Button>
          </div>

          <LegalDisclaimer variant="compact" />
        </form>
      )}

      {/* Results */}
      {result && (
        <div id="risk-report-result" className="space-y-5">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Risk report</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
                type="button"
              >
                Check another
              </Button>
              {result.saved && result.case_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/dashboard')}
                  type="button"
                >
                  Dashboard
                </Button>
              )}
            </div>
          </div>

          {/* Report card */}
          <RiskReport report={result} />

          {/* Saved indicator for authenticated users */}
          {result.saved && result.case_id && (
            <p className="text-center text-xs text-muted-foreground">
              ✓ Saved to your account —{' '}
              <a
                href={`/cases/${result.case_id}`}
                className="underline underline-offset-2 hover:text-foreground"
              >
                view case page
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
