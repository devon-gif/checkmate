'use client'

/**
 * AdminFeedbackRow
 *
 * Renders a single feedback entry with full case context and inline
 * admin status/notes controls. Calls PATCH /api/admin/feedback/[id].
 */
import * as React from 'react'
import { CaseRiskBadge } from '@/components/case-risk-badge'
import { GlassCard } from '@/components/checkmate/GlassCard'
import { humanizeCategory } from '@/lib/checkmate-shared'

const ADMIN_STATUSES = [
  { value: '', label: '— unreviewed —' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'false_positive', label: 'False positive' },
  { value: 'false_negative', label: 'False negative' },
  { value: 'needs_rule_update', label: 'Needs rule update' },
  { value: 'needs_prompt_update', label: 'Needs prompt update' }
] as const

const REASON_LABELS: Record<string, string> = {
  too_risky: 'Too risky',
  not_risky_enough: 'Not risky enough',
  missed_red_flag: 'Missed a red flag',
  wrong_category: 'Wrong category',
  confusing_explanation: 'Confusing explanation',
  other: 'Other'
}

type FeedbackEntry = {
  id: string
  case_id: string
  user_id: string
  rating: 'accurate' | 'not_right'
  reason: string | null
  note: string | null
  admin_status: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
  cases: {
    id: string
    title: string
    category: string
    risk_level: string
    risk_score: number
    input_text: string | null
    input_url: string | null
    created_at: string
  } | null
  risk_reports: Array<{
    summary: string | null
    red_flags: unknown
    recommended_actions: unknown
  }>
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

export function AdminFeedbackRow({ fb }: { fb: FeedbackEntry }) {
  const [status, setStatus] = React.useState(fb.admin_status ?? '')
  const [notes, setNotes] = React.useState(fb.admin_notes ?? '')
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)
  const [inputOpen, setInputOpen] = React.useState(false)

  const caseData = fb.cases
  const report = fb.risk_reports?.[0] ?? null
  const redFlags = asStringArray(report?.red_flags)

  async function save() {
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch(`/api/admin/feedback/${fb.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_status: status || null,
          admin_notes: notes.trim() || null
        })
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setErr((json as { error?: string }).error ?? 'Save failed')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } catch {
      setErr('Network error')
    } finally {
      setSaving(false)
    }
  }

  const ratingColor =
    fb.rating === 'accurate'
      ? 'border-cm-green/30 bg-cm-green/10 text-cm-green'
      : 'border-red-400/30 bg-red-400/10 text-red-300'

  return (
    <GlassCard className="px-6 py-5">
      {/* Top row: rating pill + case info + timestamp */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${ratingColor}`}
          >
            {fb.rating === 'accurate' ? '✓ Accurate' : '✗ Not right'}
          </span>
          {fb.reason && (
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/50">
              {REASON_LABELS[fb.reason] ?? fb.reason}
            </span>
          )}
          {fb.admin_status && (
            <span className="rounded-full border border-yellow-400/20 bg-yellow-400/5 px-2 py-0.5 text-[11px] text-yellow-300/70">
              {fb.admin_status.replace(/_/g, ' ')}
            </span>
          )}
        </div>
        <span className="shrink-0 text-xs text-white/25">
          {new Date(fb.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </div>

      {/* Case detail */}
      {caseData ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-white/30">{humanizeCategory(caseData.category)}</span>
          <CaseRiskBadge level={caseData.risk_level} />
          <span className="font-mono text-xs text-white/40">Score: {caseData.risk_score}</span>
          <a
            href={`/dashboard`}
            className="text-xs text-white/30 transition hover:text-cm-green"
            title={caseData.id}
          >
            Case: {caseData.id.slice(0, 8)}…
          </a>
        </div>
      ) : (
        <p className="mt-2 text-xs text-white/25">Case deleted</p>
      )}

      {caseData?.title && (
        <p className="mt-2 text-sm font-medium text-white/70">{caseData.title}</p>
      )}

      {/* User note */}
      {fb.note && (
        <div className="mt-3 rounded-lg border border-white/8 bg-white/3 px-3 py-2.5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/30">
            User note
          </p>
          <p className="text-xs leading-5 text-white/60">{fb.note}</p>
        </div>
      )}

      {/* Original input (collapsible) */}
      {caseData?.input_text && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setInputOpen(o => !o)}
            className="text-xs text-white/30 transition hover:text-white/60"
          >
            {inputOpen ? '▾ Hide original input' : '▸ Show original input'}
          </button>
          {inputOpen && (
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-white/8 bg-white/3 px-3 py-2.5 text-[11px] leading-5 text-white/50">
              {caseData.input_text}
            </pre>
          )}
        </div>
      )}

      {/* Ray's summary */}
      {report?.summary && (
        <div className="mt-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/30">
            Ray&apos;s summary
          </p>
          <p className="text-xs leading-5 text-white/55">{report.summary}</p>
        </div>
      )}

      {/* Red flags */}
      {redFlags.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/30">
            Red flags Ray noticed ({redFlags.length})
          </p>
          <ul className="space-y-1">
            {redFlags.slice(0, 5).map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-white/45">
                <span className="mt-0.5 text-red-400/70">!</span>
                <span>{f}</span>
              </li>
            ))}
            {redFlags.length > 5 && (
              <li className="text-[11px] text-white/25">+{redFlags.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Admin controls */}
      <div className="mt-4 border-t border-white/8 pt-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-white/25">
          Admin review
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-[10px] text-white/30">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 focus:outline-none focus:border-white/20"
            >
              {ADMIN_STATUSES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[260px]">
            <label className="mb-1 block text-[10px] text-white/30">Admin notes</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Internal notes…"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 placeholder-white/20 focus:border-white/20 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center rounded-lg border border-cm-green/30 bg-cm-green/10 px-4 py-2 text-xs font-medium text-cm-green transition hover:bg-cm-green/15 disabled:opacity-50"
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
        {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
      </div>
    </GlassCard>
  )
}
