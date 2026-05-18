'use client'

import { useState } from 'react'
import { GradientButton } from '@/components/checkmate/GradientButton'

interface AddNoteFormProps {
  userId: string
  adminEmail: string
}

export function AddNoteForm({ userId, adminEmail }: AddNoteFormProps) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!note.trim()) return
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/admin/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, note: note.trim() })
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }

      setNote('')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Add an internal note about this customer…"
        rows={3}
        className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white placeholder-white/30 outline-none focus:border-cm-green/50 resize-none"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex items-center gap-3">
        <GradientButton
          variant="secondary"
          type="submit"
          disabled={saving || !note.trim()}
        >
          {saving ? 'Saving…' : 'Save note'}
        </GradientButton>
        {saved && <span className="text-xs text-cm-green">✓ Saved</span>}
      </div>
    </form>
  )
}
