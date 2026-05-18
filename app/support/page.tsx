'use client'
/**
 * app/support/page.tsx — Public support / contact form
 *
 * Accessible without login. Submits to /api/support/submit.
 */
import { useState } from 'react'
import { GlassCard } from '@/components/checkmate/GlassCard'
import { GradientButton } from '@/components/checkmate/GradientButton'

const CATEGORIES = [
  { value: 'general', label: 'General question' },
  { value: 'billing', label: 'Billing' },
  { value: 'cancellation', label: 'Cancellation request' },
  { value: 'bug', label: 'Bug report' },
  { value: 'feature', label: 'Feature request' },
  { value: 'other', label: 'Other' }
]

export default function SupportPage() {
  const [form, setForm] = useState({
    email: '',
    subject: '',
    message: '',
    category: 'general'
  })
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function update(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')

    try {
      const res = await fetch('/api/support/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }

      setStatus('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-cm-bg px-6 py-20 text-white">
      <div className="mx-auto max-w-xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <span className="inline-block rounded-full border border-cm-green/30 bg-cm-green/10 px-3 py-1 text-xs font-medium text-cm-green">
            Support
          </span>
          <h1 className="mt-4 text-3xl font-bold text-white">
            How can we help?
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Send us a message and we&apos;ll get back to you within 1 business day.
          </p>
        </div>

        {status === 'done' ? (
          <GlassCard className="p-10 text-center">
            <p className="text-4xl">✅</p>
            <h2 className="mt-4 text-xl font-semibold text-white">
              Message received
            </h2>
            <p className="mt-2 text-sm text-white/50">
              We&apos;ll be in touch soon. You can close this tab.
            </p>
            <div className="mt-6">
              <GradientButton
                variant="secondary"
                href="/dashboard"
              >
                Back to dashboard
              </GradientButton>
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Category */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">
                  Topic
                </label>
                <select
                  value={form.category}
                  onChange={e => update('category', e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-cm-green/50"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value} className="bg-neutral-900">
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Email */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">
                  Your email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-cm-green/50"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">
                  Subject <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.subject}
                  onChange={e => update('subject', e.target.value)}
                  placeholder="Brief summary…"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-cm-green/50"
                />
              </div>

              {/* Message */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">
                  Message <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={e => update('message', e.target.value)}
                  placeholder="Describe your question or issue…"
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-cm-green/50"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-red-400">{errorMsg}</p>
              )}

              <GradientButton
                variant="primary"
                type="submit"
                disabled={status === 'sending'}
                className="w-full justify-center"
              >
                {status === 'sending' ? 'Sending…' : 'Send message'}
              </GradientButton>
            </form>
          </GlassCard>
        )}
      </div>
    </div>
  )
}
