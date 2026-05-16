'use client'

import * as React from 'react'
import { GlassCard } from '@/components/checkmate/GlassCard'

interface ScamWatchCardProps {
  initialEnabled: boolean
}

export function ScamWatchCard({ initialEnabled }: ScamWatchCardProps) {
  const [enabled, setEnabled] = React.useState(initialEnabled)
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)

  async function toggle() {
    const next = !enabled
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekly_email_enabled: next })
      })
      if (res.ok) {
        setEnabled(next)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <GlassCard className="px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-base">📬</span>
            <h3 className="text-sm font-semibold text-white">
              Ray's Weekly Scam Watch
            </h3>
          </div>
          <p className="mt-1.5 max-w-lg text-xs leading-5 text-white/45">
            Get a weekly email with common scams, ghost jobs, phishing links,
            suspicious bills, and red flags to watch for.
          </p>
          <p className="mt-1 text-[11px] text-white/25">
            You can turn this off anytime.
          </p>
        </div>

        {/* Toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={toggle}
          disabled={saving}
          className={[
            'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
            'transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-cm-green/50',
            enabled ? 'bg-cm-green' : 'bg-white/10',
            saving ? 'opacity-50' : ''
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className="sr-only">
            {enabled ? 'Disable weekly scam watch email' : 'Enable weekly scam watch email'}
          </span>
          <span
            aria-hidden="true"
            className={[
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0',
              'transition duration-200 ease-in-out',
              enabled ? 'translate-x-5' : 'translate-x-0'
            ].join(' ')}
          />
        </button>
      </div>

      {/* Saved confirmation */}
      {saved && (
        <p className="mt-2.5 text-[11px] text-cm-green/70">
          {enabled ? '✓ Weekly scam alerts turned on.' : '✓ Weekly scam alerts turned off.'}
        </p>
      )}
    </GlassCard>
  )
}
