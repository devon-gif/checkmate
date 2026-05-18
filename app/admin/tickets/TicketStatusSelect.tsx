'use client'

import { useState } from 'react'

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const
type Status = (typeof STATUSES)[number]

interface Props {
  ticketId: string
  currentStatus: Status
}

export function TicketStatusSelect({ ticketId, currentStatus }: Props) {
  const [status, setStatus] = useState<Status>(currentStatus)
  const [saving, setSaving] = useState(false)

  async function handleChange(newStatus: Status) {
    setSaving(true)
    try {
      await fetch('/api/admin/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, status: newStatus })
      })
      setStatus(newStatus)
    } finally {
      setSaving(false)
    }
  }

  const colorMap: Record<Status, string> = {
    open: 'text-yellow-400',
    in_progress: 'text-blue-400',
    resolved: 'text-green-400',
    closed: 'text-white/30'
  }

  return (
    <select
      value={status}
      disabled={saving}
      onChange={e => handleChange(e.target.value as Status)}
      className={`rounded-lg border border-white/10 bg-transparent py-0.5 pl-2 pr-6 text-xs font-medium outline-none ${colorMap[status]}`}
    >
      {STATUSES.map(s => (
        <option key={s} value={s} className="bg-neutral-900 text-white">
          {s}
        </option>
      ))}
    </select>
  )
}
