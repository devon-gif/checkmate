'use client'

import { useState } from 'react'

import {
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  type TicketStatus
} from '@/lib/support/types'

interface Props {
  ticketId: string
  /** Stored status — may be a legacy value like 'in_progress' for old rows. */
  currentStatus: string
}

export function TicketStatusSelect({ ticketId, currentStatus }: Props) {
  // Show legacy values as-is, but only let admins WRITE canonical statuses.
  const initial = (TICKET_STATUSES as readonly string[]).includes(currentStatus)
    ? (currentStatus as TicketStatus)
    : ('open' as TicketStatus)
  const [status, setStatus] = useState<TicketStatus>(initial)
  const [saving, setSaving] = useState(false)

  async function handleChange(newStatus: TicketStatus) {
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

  const colorMap: Record<TicketStatus, string> = {
    open: 'text-yellow-400',
    waiting_on_customer: 'text-orange-400',
    in_review: 'text-blue-400',
    resolved: 'text-green-400',
    closed: 'text-white/30'
  }

  return (
    <select
      value={status}
      disabled={saving}
      onChange={e => handleChange(e.target.value as TicketStatus)}
      className={`rounded-lg border border-white/10 bg-transparent py-0.5 pl-2 pr-6 text-xs font-medium outline-none ${colorMap[status]}`}
    >
      {TICKET_STATUSES.map(s => (
        <option key={s} value={s} className="bg-neutral-900 text-white">
          {TICKET_STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  )
}
