'use client'

/**
 * FeedbackWidget
 *
 * Inline "Was this helpful?" widget that appears at the bottom of a result
 * report. Users can rate the result as Accurate or Not Right, optionally
 * add a reason (when Not Right) and a short note.
 *
 * Submits to POST /api/feedback. One feedback row per case per user
 * (re-submitting updates the existing row).
 */
import * as React from 'react'

const REASONS = [
  { value: 'too_risky', label: 'Too risky' },
  { value: 'not_risky_enough', label: 'Not risky enough' },
  { value: 'missed_red_flag', label: 'Missed a red flag' },
  { value: 'wrong_category', label: 'Wrong category' },
  { value: 'confusing_explanation', label: 'Confusing explanation' },
  { value: 'other', label: 'Other' }
] as const

type Reason = (typeof REASONS)[number]['value']
type Rating = 'accurate' | 'not_right'
type Step = 'idle' | 'not_right_details' | 'submitting' | 'done' | 'error'

interface FeedbackWidgetProps {
  caseId: string
}

export function FeedbackWidget({ caseId }: FeedbackWidgetProps) {
  const [step, setStep] = React.useState<Step>('idle')
  const [rating, setRating] = React.useState<Rating | null>(null)
  const [reason, setReason] = React.useState<Reason | null>(null)
  const [note, setNote] = React.useState('')
  const isSubmitting = step === 'submitting'

  async function submit(r: Rating, re: Reason | null, n: string) {
    setStep('submitting')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: caseId,
          rating: r,
          reason: re,
          note: n.trim() || null
        })
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        console.error('[FeedbackWidget] error:', json)
        setStep('error')
      } else {
        setStep('done')
      }
    } catch (err) {
      console.error('[FeedbackWidget] fetch error:', err)
      setStep('error')
    }
  }

  function handleRatingClick(r: Rating) {
    setRating(r)
    if (r === 'accurate') {
      submit(r, null, '')
    } else {
      setStep('not_right_details')
    }
  }

  function handleSubmitNotRight() {
    submit('not_right', reason, note)
  }

  if (step === 'done') {
    return (
      <div className="rounded-xl border border-cm-green/20 bg-cm-green/5 px-5 py-4">
        <p className="text-sm text-cm-green/80">
          ✓ Thanks — your feedback helps Ray improve.
        </p>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4">
        <p className="text-sm text-red-400">
          Something went wrong saving your feedback. Please try again.
        </p>
        <button
          type="button"
          onClick={() => { setStep('idle'); setRating(null); setReason(null); setNote('') }}
          className="mt-2 text-xs text-white/40 underline hover:text-white/70"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/8 bg-white/3 px-5 py-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-white/40">
        Was this helpful?
      </p>

      {/* Initial rating buttons */}
      {(step === 'idle' || step === 'not_right_details') && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            className={[
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition',
              rating === 'accurate'
                ? 'border-cm-green/50 bg-cm-green/10 text-cm-green'
                : 'border-white/10 text-white/50 hover:border-cm-green/30 hover:text-cm-green'
            ].join(' ')}
          >
            <span>✓</span> Accurate
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleRatingClick('not_right')}
            className={[
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition',
              rating === 'not_right'
                ? 'border-red-400/50 bg-red-400/10 text-red-400'
                : 'border-white/10 text-white/50 hover:border-red-400/30 hover:text-red-400'
            ].join(' ')}
          >
            <span>✗</span> Not right
          </button>
        </div>
      )}

      {/* Not-right detail panel */}
      {step === 'not_right_details' && (
        <div className="mt-4 space-y-4">
          {/* Reason chips */}
          <div>
            <p className="mb-2 text-xs text-white/35">What was off?</p>
            <div className="flex flex-wrap gap-2">
              {REASONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setReason(r => (r === value ? null : value))}
                  className={[
                    'rounded-full border px-3 py-1 text-xs transition',
                    reason === value
                      ? 'border-red-400/50 bg-red-400/10 text-red-300'
                      : 'border-white/10 text-white/40 hover:border-white/25 hover:text-white/70'
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional note */}
          <div>
            <label
              htmlFor="feedback-note"
              className="mb-1.5 block text-xs text-white/35"
            >
              What should Ray have noticed?{' '}
              <span className="text-white/20">(optional)</span>
            </label>
            <textarea
              id="feedback-note"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="Add any context that might help Ray improve…"
              className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 placeholder-white/20 focus:border-white/20 focus:outline-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSubmitNotRight}
              disabled={isSubmitting}
              className="inline-flex items-center rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-400/15 disabled:opacity-50"
            >
              {isSubmitting ? 'Sending…' : 'Submit feedback'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('idle'); setRating(null); setReason(null); setNote('') }}
              className="text-xs text-white/30 hover:text-white/50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === 'submitting' && (
        <p className="mt-3 text-xs text-white/30">Saving…</p>
      )}
    </div>
  )
}
