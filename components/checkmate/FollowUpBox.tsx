'use client'

import * as React from 'react'
import { GlassCard } from '@/components/checkmate/GlassCard'

interface FollowUpBoxProps {
  caseId: string
}

export function FollowUpBox({ caseId }: FollowUpBoxProps) {
  const [question, setQuestion] = React.useState('')
  const [answer, setAnswer] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const answerRef = React.useRef<HTMLDivElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q || loading) return

    setLoading(true)
    setError(null)
    setAnswer(null)

    try {
      const res = await fetch(`/api/cases/${caseId}/follow-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as any).error ?? 'Ray is temporarily unavailable. Please try again.')
        return
      }

      const data = await res.json()
      setAnswer((data as any).answer ?? '')
      setQuestion('')
      // Scroll answer into view
      setTimeout(() => answerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <GlassCard className="mt-6 px-5 py-5">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/40">
        Ask Ray a follow-up
      </h2>
      <p className="mb-4 text-xs text-white/30">
        Ask Ray a question about this check. Results are informational only.
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2.5">
        <input
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Example: What should I ask before replying?"
          maxLength={500}
          disabled={loading}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:border-cm-green/40 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!question.trim() || loading}
          className="flex-shrink-0 rounded-lg border border-cm-green/30 bg-cm-green/10 px-4 py-2 text-xs font-medium text-cm-green transition hover:bg-cm-green/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? 'Asking…' : 'Ask Ray'}
        </button>
      </form>

      {error && (
        <p className="mt-3 text-xs text-red-400">{error}</p>
      )}

      {answer && (
        <div
          ref={answerRef}
          className="mt-4 rounded-lg border border-white/8 bg-white/3 px-4 py-4"
        >
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-cm-green/70">
            Ray&apos;s response
          </p>
          <p className="whitespace-pre-wrap text-sm leading-7 text-white/70">
            {answer}
          </p>
        </div>
      )}
    </GlassCard>
  )
}
