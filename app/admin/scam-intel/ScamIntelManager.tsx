'use client'

/**
 * ScamIntelManager
 *
 * Client-side CRUD for the scam_intel catalog. Renders a create form and an
 * editable list. Calls:
 *   POST  /api/admin/scam-intel        (create)
 *   PATCH /api/admin/scam-intel/[id]   (edit + status toggle)
 *
 * Signals are edited as one-per-line text and sent as a string[] payload.
 */
import * as React from 'react'
import { useRouter } from 'next/navigation'

import { GlassCard } from '@/components/checkmate/GlassCard'

export interface ScamIntelRow {
  id: string
  name: string
  category: string
  severity: string
  description: string
  signals: unknown
  recommended_action: string
  source_type: string
  source_url: string | null
  confidence: string
  status: string
  example_text?: string | null
  expected_risk_level?: string | null
  expected_category?: string | null
  last_tested_at?: string | null
  last_test_result?: unknown
  first_seen: string
  last_seen: string
  created_at: string
  updated_at: string
}

const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const
const CONFIDENCES = ['low', 'medium', 'high'] as const
const STATUSES = ['active', 'inactive', 'archived'] as const
const RISK_LEVELS = ['low', 'medium', 'high', 'very_high', 'needs_more_info'] as const
const CASE_CATEGORIES = [
  'scam_text',
  'job_scam_or_ghost_job',
  'bill_or_fee',
  'phishing_url',
  'rental_or_marketplace',
  'email',
  'unknown'
] as const

interface TestResult {
  tested_at?: string
  expected_risk_level?: string | null
  expected_category?: string | null
  actual_risk_level?: string
  actual_risk_score?: number
  actual_category?: string
  summary?: string
  red_flags?: string[]
  used_fallback?: boolean
  level_pass?: boolean | null
  category_pass?: boolean | null
  pass?: boolean | null
}

function signalsToText(v: unknown): string {
  if (Array.isArray(v)) return v.map(s => String(s)).join('\n')
  if (typeof v === 'string') return v
  return ''
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'border-red-500/50 bg-red-500/10 text-red-300',
  high: 'border-orange-500/50 bg-orange-500/10 text-orange-300',
  medium: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300',
  low: 'border-white/20 bg-white/5 text-white/60'
}

function Field({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/30">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/25 focus:border-cm-green/50 focus:outline-none'

function CreateForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [category, setCategory] = React.useState('')
  const [severity, setSeverity] = React.useState<string>('medium')
  const [confidence, setConfidence] = React.useState<string>('medium')
  const [description, setDescription] = React.useState('')
  const [signals, setSignals] = React.useState('')
  const [recommendedAction, setRecommendedAction] = React.useState('')
  const [sourceType, setSourceType] = React.useState('curated')
  const [sourceUrl, setSourceUrl] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)

  function reset() {
    setName('')
    setCategory('')
    setSeverity('medium')
    setConfidence('medium')
    setDescription('')
    setSignals('')
    setRecommendedAction('')
    setSourceType('curated')
    setSourceUrl('')
  }

  async function submit() {
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch('/api/admin/scam-intel', {
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
          source_type: sourceType,
          source_url: sourceUrl
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
        + New pattern
      </button>
    )
  }

  return (
    <GlassCard className="space-y-4 px-5 py-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">New scam pattern</h2>
        <button onClick={() => setOpen(false)} className="text-xs text-white/40 hover:text-white/70">
          Cancel
        </button>
      </div>
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
        <Field label="Source type">
          <input className={inputClass} value={sourceType} onChange={e => setSourceType(e.target.value)} />
        </Field>
        <Field label="Source URL (optional)">
          <input className={inputClass} value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://" />
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
          {saving ? 'Saving…' : 'Create pattern'}
        </button>
      </div>
    </GlassCard>
  )
}

function TestPanel({ row, onTested }: { row: ScamIntelRow; onTested: () => void }) {
  const [exampleText, setExampleText] = React.useState(row.example_text ?? '')
  const [expectedLevel, setExpectedLevel] = React.useState(row.expected_risk_level ?? '')
  const [expectedCategory, setExpectedCategory] = React.useState(row.expected_category ?? '')
  const [running, setRunning] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<TestResult | null>(
    (row.last_test_result as TestResult) ?? null
  )

  async function run() {
    setRunning(true)
    setErr(null)
    try {
      const res = await fetch(`/api/admin/scam-intel/${row.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          example_text: exampleText,
          expected_risk_level: expectedLevel || undefined,
          expected_category: expectedCategory || undefined
        })
      })
      const json = await res.json()
      if (!res.ok) {
        setErr(json?.error ?? 'test_failed')
        return
      }
      setResult(json.result as TestResult)
      onTested()
    } catch {
      setErr('network_error')
    } finally {
      setRunning(false)
    }
  }

  const pass = result?.pass
  const passBadge =
    pass === true
      ? { text: 'PASS', cls: 'border-cm-green/50 bg-cm-green/10 text-cm-green' }
      : pass === false
        ? { text: 'FAIL', cls: 'border-red-500/50 bg-red-500/10 text-red-300' }
        : { text: 'NO EXPECTATION', cls: 'border-white/15 text-white/40' }

  return (
    <div className="space-y-4 border-t border-white/10 pt-4">
      <p className="text-xs text-white/40">
        Runs this example through the live analyzer (no quota, no saved case, no
        email). Verifies whether Ray currently detects it — it does not change
        scoring or promote the pattern.
      </p>
      <Field label="Example message">
        <textarea
          className={inputClass}
          rows={4}
          value={exampleText}
          onChange={e => setExampleText(e.target.value)}
          placeholder="Paste an example scam message for this pattern…"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Expected risk level (optional)">
          <select className={inputClass} value={expectedLevel} onChange={e => setExpectedLevel(e.target.value)}>
            <option value="">—</option>
            {RISK_LEVELS.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="Expected category (optional)">
          <select className={inputClass} value={expectedCategory} onChange={e => setExpectedCategory(e.target.value)}>
            <option value="">—</option>
            {CASE_CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>
      {err && <p className="text-xs text-red-400">Error: {err}</p>}
      <div className="flex items-center justify-between gap-3">
        {row.last_tested_at && (
          <span className="text-xs text-white/30">
            Last tested {new Date(row.last_tested_at).toLocaleString()}
          </span>
        )}
        <button
          onClick={run}
          disabled={running || !exampleText.trim()}
          className="ml-auto rounded-lg border border-cm-green/40 bg-cm-green/10 px-4 py-2 text-sm font-medium text-cm-green transition hover:bg-cm-green/20 disabled:opacity-40"
        >
          {running ? 'Running…' : 'Run test'}
        </button>
      </div>

      {result && (
        <div className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={['rounded-full border px-2 py-0.5 text-xs font-semibold', passBadge.cls].join(' ')}>
              {passBadge.text}
            </span>
            <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-white/60">
              {result.actual_risk_level} · {result.actual_risk_score}
            </span>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-white/40">
              {result.actual_category}
            </span>
            {result.used_fallback && (
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-white/30">fallback</span>
            )}
          </div>
          {result.expected_risk_level && (
            <p className="text-xs text-white/40">
              Expected level {result.expected_risk_level}
              {result.level_pass === false ? ' ✗' : ' ✓'}
              {result.expected_category
                ? ` · category ${result.expected_category}${result.category_pass === false ? ' ✗' : ' ✓'}`
                : ''}
            </p>
          )}
          {result.summary && <p className="text-sm text-white/70">{result.summary}</p>}
          {Array.isArray(result.red_flags) && result.red_flags.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-white/45">
              {result.red_flags.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function PatternRow({ row, onChanged }: { row: ScamIntelRow; onChanged: () => void }) {
  const [editing, setEditing] = React.useState(false)
  const [testing, setTesting] = React.useState(false)
  const [category, setCategory] = React.useState(row.category)
  const [severity, setSeverity] = React.useState(row.severity)
  const [confidence, setConfidence] = React.useState(row.confidence)
  const [description, setDescription] = React.useState(row.description)
  const [signals, setSignals] = React.useState(signalsToText(row.signals))
  const [recommendedAction, setRecommendedAction] = React.useState(row.recommended_action)
  const [sourceUrl, setSourceUrl] = React.useState(row.source_url ?? '')
  const [saving, setSaving] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)

  async function patch(payload: Record<string, unknown>) {
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch(`/api/admin/scam-intel/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const json = await res.json()
      if (!res.ok) {
        setErr(json?.error ?? 'update_failed')
        return
      }
      setEditing(false)
      onChanged()
    } catch {
      setErr('network_error')
    } finally {
      setSaving(false)
    }
  }

  const signalsArr = Array.isArray(row.signals) ? row.signals.map(String) : []

  return (
    <GlassCard className="space-y-3 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-white">{row.name}</span>
          <span className={['rounded-full border px-2 py-0.5 text-xs', SEVERITY_STYLES[row.severity] ?? SEVERITY_STYLES.low].join(' ')}>
            {row.severity}
          </span>
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-white/40">{row.category}</span>
          <span
            className={[
              'rounded-full border px-2 py-0.5 text-xs',
              row.status === 'active' ? 'border-cm-green/40 text-cm-green' : 'border-white/10 text-white/40'
            ].join(' ')}
          >
            {row.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => patch({ status: row.status === 'active' ? 'inactive' : 'active' })}
            disabled={saving}
            className="rounded-lg border border-white/15 px-3 py-1 text-xs text-white/60 transition hover:text-white disabled:opacity-40"
          >
            {row.status === 'active' ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={() => {
              setTesting(v => !v)
              setEditing(false)
            }}
            className={[
              'rounded-lg border px-3 py-1 text-xs transition',
              testing ? 'border-cm-green/50 text-cm-green' : 'border-white/15 text-white/60 hover:text-white'
            ].join(' ')}
          >
            {testing ? 'Close test' : 'Test'}
          </button>
          <button
            onClick={() => {
              setEditing(v => !v)
              setTesting(false)
            }}
            className="rounded-lg border border-white/15 px-3 py-1 text-xs text-white/60 transition hover:text-white"
          >
            {editing ? 'Close' : 'Edit'}
          </button>
        </div>
      </div>

      {!testing && Boolean(row.last_test_result) && (() => {
        const tr = row.last_test_result as TestResult
        const p = tr.pass
        const cls =
          p === true ? 'text-cm-green' : p === false ? 'text-red-300' : 'text-white/40'
        return (
          <p className={['text-xs', cls].join(' ')}>
            Last test: {p === true ? 'PASS' : p === false ? 'FAIL' : 'ran'} ·{' '}
            {tr.actual_risk_level}/{tr.actual_risk_score} · {tr.actual_category}
          </p>
        )
      })()}

      {!editing && (
        <div className="space-y-2">
          {row.description && <p className="text-sm text-white/70">{row.description}</p>}
          {signalsArr.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-white/45">
              {signalsArr.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
          {row.recommended_action && (
            <p className="text-xs text-white/50">
              <span className="text-white/30">Action: </span>
              {row.recommended_action}
            </p>
          )}
        </div>
      )}

      {editing && (
        <div className="space-y-4 border-t border-white/10 pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <input className={inputClass} value={category} onChange={e => setCategory(e.target.value)} />
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
            <Field label="Source URL (optional)">
              <input className={inputClass} value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} />
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
          <div className="flex justify-end gap-2">
            <button
              onClick={() =>
                patch({
                  category,
                  severity,
                  confidence,
                  description,
                  signals,
                  recommended_action: recommendedAction,
                  source_url: sourceUrl
                })
              }
              disabled={saving}
              className="rounded-lg border border-cm-green/40 bg-cm-green/10 px-4 py-2 text-sm font-medium text-cm-green transition hover:bg-cm-green/20 disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}

      {testing && <TestPanel row={row} onTested={onChanged} />}

      {err && !editing && <p className="text-xs text-red-400">Error: {err}</p>}
    </GlassCard>
  )
}

export function ScamIntelManager({ initialPatterns }: { initialPatterns: ScamIntelRow[] }) {
  const router = useRouter()
  const refresh = React.useCallback(() => router.refresh(), [router])

  return (
    <div className="space-y-4">
      <CreateForm onCreated={refresh} />
      {initialPatterns.length === 0 ? (
        <GlassCard className="px-6 py-10 text-center">
          <p className="text-sm text-white/40">No scam-intel patterns yet.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {initialPatterns.map(row => (
            <PatternRow key={row.id} row={row} onChanged={refresh} />
          ))}
        </div>
      )}
    </div>
  )
}
