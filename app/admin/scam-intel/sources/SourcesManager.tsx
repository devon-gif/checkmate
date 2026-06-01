'use client'

/**
 * SourcesManager — Scam Intel v2 source intake + review queue (client).
 *
 * Calls:
 *   POST  /api/admin/scam-intel/pending              (create source)
 *   PATCH /api/admin/scam-intel/pending/[id]         (status / fields)
 *   POST  /api/admin/scam-intel/pending/[id]/promote (promote into scam_intel)
 *
 * Nothing here changes analyzer scoring.
 */
import * as React from 'react'
import { useRouter } from 'next/navigation'

import { GlassCard } from '@/components/checkmate/GlassCard'

export interface PendingSourceRow {
  id: string
  name: string | null
  category: string | null
  severity: string | null
  description: string
  signals: unknown
  recommended_action: string
  source_type: string
  source_url: string | null
  confidence: string
  review_status: string
  notes: string | null
  promoted_scam_intel_id: string | null
  raw: unknown
  created_at: string
  updated_at: string
}

const SOURCE_TYPES = [
  'ftc',
  'fbi_ic3',
  'cisa',
  'phishtank',
  'openphish',
  'linkedin',
  'reddit',
  'user_report',
  'other'
] as const

const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const
const CONFIDENCES = ['low', 'medium', 'high'] as const

const inputClass =
  'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/25 focus:border-cm-green/50 focus:outline-none'

const STATUS_STYLES: Record<string, string> = {
  pending: 'border-yellow-500/50 text-yellow-300',
  reviewed: 'border-sky-500/50 text-sky-300',
  rejected: 'border-white/15 text-white/40',
  promoted: 'border-cm-green/50 text-cm-green'
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/30">{label}</span>
      {children}
    </label>
  )
}

// ── Intake form ──────────────────────────────────────────────────────────────
function IntakeForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = React.useState(false)
  const [sourceType, setSourceType] = React.useState<string>('ftc')
  const [sourceUrl, setSourceUrl] = React.useState('')
  const [suspectedCategory, setSuspectedCategory] = React.useState('')
  const [suspectedSeverity, setSuspectedSeverity] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)

  function reset() {
    setSourceType('ftc')
    setSourceUrl('')
    setSuspectedCategory('')
    setSuspectedSeverity('')
    setNotes('')
  }

  async function submit() {
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch('/api/admin/scam-intel/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type: sourceType,
          source_url: sourceUrl,
          suspected_category: suspectedCategory,
          suspected_severity: suspectedSeverity || undefined,
          notes
        })
      })
      const json = await res.json()
      if (!res.ok) {
        setErr(json?.error ?? 'create_failed')
        return
      }
      reset()
      setOpen(false)
      onCreated()
    } catch {
      setErr('network_error')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-cm-green/40 bg-cm-green/10 px-4 py-2 text-sm font-medium text-cm-green transition hover:bg-cm-green/20"
      >
        + Add source
      </button>
    )
  }

  return (
    <GlassCard className="space-y-4 px-5 py-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">New scam source</h2>
        <button onClick={() => setOpen(false)} className="text-xs text-white/40 hover:text-white/70">
          Cancel
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Source type (required)">
          <select className={inputClass} value={sourceType} onChange={e => setSourceType(e.target.value)}>
            {SOURCE_TYPES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Source URL (optional)">
          <input className={inputClass} value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://" />
        </Field>
        <Field label="Suspected category (optional)">
          <input className={inputClass} value={suspectedCategory} onChange={e => setSuspectedCategory(e.target.value)} placeholder="phishing" />
        </Field>
        <Field label="Suspected severity (optional)">
          <select className={inputClass} value={suspectedSeverity} onChange={e => setSuspectedSeverity(e.target.value)}>
            <option value="">—</option>
            {SEVERITIES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Notes (optional)">
        <textarea className={inputClass} rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="What is this source / what scam pattern does it describe?" />
      </Field>
      {err && <p className="text-xs text-red-400">Error: {err}</p>}
      <div className="flex justify-end">
        <button
          onClick={submit}
          disabled={saving}
          className="rounded-lg border border-cm-green/40 bg-cm-green/10 px-4 py-2 text-sm font-medium text-cm-green transition hover:bg-cm-green/20 disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Add source'}
        </button>
      </div>
    </GlassCard>
  )
}

// ── Promote form ─────────────────────────────────────────────────────────────
function PromoteForm({ row, onDone }: { row: PendingSourceRow; onDone: () => void }) {
  const [name, setName] = React.useState('')
  const [category, setCategory] = React.useState(row.category ?? '')
  const [severity, setSeverity] = React.useState(row.severity || 'medium')
  const [confidence, setConfidence] = React.useState('medium')
  const [description, setDescription] = React.useState(row.notes ?? '')
  const [signals, setSignals] = React.useState('')
  const [recommendedAction, setRecommendedAction] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)

  async function submit() {
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch(`/api/admin/scam-intel/pending/${row.id}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          severity,
          confidence,
          description,
          signals,
          recommended_action: recommendedAction,
          source_type: row.source_type,
          source_url: row.source_url ?? undefined
        })
      })
      const json = await res.json()
      if (!res.ok) {
        setErr(json?.error ?? 'promote_failed')
        return
      }
      onDone()
    } catch {
      setErr('network_error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 border-t border-white/10 pt-4">
      <p className="text-xs text-white/40">
        Promote into the curated catalog. (This writes to the scam_intel table for
        review — it does not change live scoring until mirrored into the in-code
        catalog.)
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name (unique key)">
          <input className={inputClass} value={name} onChange={e => setName(e.target.value)} placeholder="snake_case_key" />
        </Field>
        <Field label="Category">
          <input className={inputClass} value={category} onChange={e => setCategory(e.target.value)} placeholder="phishing" />
        </Field>
        <Field label="Severity">
          <select className={inputClass} value={severity} onChange={e => setSeverity(e.target.value)}>
            {SEVERITIES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Confidence">
          <select className={inputClass} value={confidence} onChange={e => setConfidence(e.target.value)}>
            {CONFIDENCES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Description">
        <textarea className={inputClass} rows={2} value={description} onChange={e => setDescription(e.target.value)} />
      </Field>
      <Field label="Signals (one per line)">
        <textarea className={inputClass} rows={4} value={signals} onChange={e => setSignals(e.target.value)} />
      </Field>
      <Field label="Recommended action">
        <textarea className={inputClass} rows={2} value={recommendedAction} onChange={e => setRecommendedAction(e.target.value)} />
      </Field>
      {err && <p className="text-xs text-red-400">Error: {err}</p>}
      <div className="flex justify-end">
        <button
          onClick={submit}
          disabled={saving || !name.trim() || !category.trim()}
          className="rounded-lg border border-cm-green/40 bg-cm-green/10 px-4 py-2 text-sm font-medium text-cm-green transition hover:bg-cm-green/20 disabled:opacity-40"
        >
          {saving ? 'Promoting…' : 'Promote to catalog'}
        </button>
      </div>
    </div>
  )
}

// ── Source row ───────────────────────────────────────────────────────────────
function SourceRow({ row, onChanged }: { row: PendingSourceRow; onChanged: () => void }) {
  const [promoting, setPromoting] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)

  async function setStatus(review_status: string) {
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/admin/scam-intel/pending/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_status })
      })
      const json = await res.json()
      if (!res.ok) {
        setErr(json?.error ?? 'update_failed')
        return
      }
      onChanged()
    } catch {
      setErr('network_error')
    } finally {
      setBusy(false)
    }
  }

  const notesPreview = row.notes ? (row.notes.length > 140 ? row.notes.slice(0, 140) + '…' : row.notes) : null
  const isPromoted = row.review_status === 'promoted'

  return (
    <GlassCard className="space-y-3 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-white/60">{row.source_type}</span>
          <span className={['rounded-full border px-2 py-0.5 text-xs', STATUS_STYLES[row.review_status] ?? STATUS_STYLES.rejected].join(' ')}>
            {row.review_status}
          </span>
          {row.severity && (
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-white/40">sev: {row.severity}</span>
          )}
          {row.category && (
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-white/40">{row.category}</span>
          )}
          <span className="text-xs text-white/30">{new Date(row.created_at).toLocaleString()}</span>
        </div>
        {!isPromoted && (
          <div className="flex items-center gap-2">
            {row.review_status !== 'reviewed' && (
              <button onClick={() => setStatus('reviewed')} disabled={busy} className="rounded-lg border border-white/15 px-3 py-1 text-xs text-white/60 transition hover:text-white disabled:opacity-40">
                Mark reviewed
              </button>
            )}
            {row.review_status !== 'pending' && (
              <button onClick={() => setStatus('pending')} disabled={busy} className="rounded-lg border border-white/15 px-3 py-1 text-xs text-white/60 transition hover:text-white disabled:opacity-40">
                Reopen
              </button>
            )}
            {row.review_status !== 'rejected' && (
              <button onClick={() => setStatus('rejected')} disabled={busy} className="rounded-lg border border-white/15 px-3 py-1 text-xs text-white/60 transition hover:text-white disabled:opacity-40">
                Reject
              </button>
            )}
            <button onClick={() => setPromoting(v => !v)} className="rounded-lg border border-cm-green/30 px-3 py-1 text-xs text-cm-green transition hover:border-cm-green/60">
              {promoting ? 'Close' : 'Promote'}
            </button>
          </div>
        )}
      </div>

      {row.source_url && (
        <a href={row.source_url} target="_blank" rel="noreferrer" className="block truncate text-xs text-sky-300/80 underline underline-offset-2 hover:text-sky-300">
          {row.source_url}
        </a>
      )}
      {notesPreview && <p className="text-sm text-white/70">{notesPreview}</p>}
      {isPromoted && row.promoted_scam_intel_id && (
        <p className="text-xs text-cm-green/70">Promoted → catalog id {row.promoted_scam_intel_id}</p>
      )}
      {err && <p className="text-xs text-red-400">Error: {err}</p>}

      {promoting && !isPromoted && <PromoteForm row={row} onDone={onChanged} />}
    </GlassCard>
  )
}

export function SourcesManager({ initialSources }: { initialSources: PendingSourceRow[] }) {
  const router = useRouter()
  const refresh = React.useCallback(() => router.refresh(), [router])

  return (
    <div className="space-y-4">
      <IntakeForm onCreated={refresh} />
      {initialSources.length === 0 ? (
        <GlassCard className="px-6 py-10 text-center">
          <p className="text-sm text-white/40">No sources yet. Paste one above.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {initialSources.map(row => (
            <SourceRow key={row.id} row={row} onChanged={refresh} />
          ))}
        </div>
      )}
    </div>
  )
}
