import type { FetchResult, ScamIntelItem } from './types'

/**
 * Pretty-print a one-line summary per item and a per-source roll-up.
 * Pure formatting; the caller decides whether to write to stdout.
 */
export interface DigestLine {
  kind: 'item' | 'header' | 'warning' | 'summary' | 'blank'
  text: string
}

export function buildDigest(results: FetchResult[], allItems: ScamIntelItem[]): DigestLine[] {
  const lines: DigestLine[] = []

  lines.push({ kind: 'header', text: '── CheckRay scam-intelligence fetch ──' })
  lines.push({ kind: 'blank', text: '' })

  // Per-source roll-up
  for (const r of results) {
    const flag = r.ok ? 'ok' : 'FAIL'
    lines.push({
      kind: 'header',
      text: `[${flag}] ${r.source_id} — ${r.items.length} item(s)`
    })
    if (r.warning) {
      lines.push({ kind: 'warning', text: `      warning: ${r.warning}` })
    }
  }
  lines.push({ kind: 'blank', text: '' })

  // Items
  for (const item of allItems) {
    lines.push({
      kind: 'item',
      text: formatItemLine(item)
    })
  }

  lines.push({ kind: 'blank', text: '' })
  lines.push({
    kind: 'summary',
    text: `Total normalized items after dedupe: ${allItems.length}`
  })
  lines.push({
    kind: 'summary',
    text:
      'Reminder: this is an internal intelligence feed only. No claims that ' +
      'any specific message is confirmed fake; phrase downstream output as ' +
      '"reported scam pattern" / "public alert" / "risk signal".'
  })

  return lines
}

export function formatItemLine(item: ScamIntelItem): string {
  const signals = item.risk_signals.length ? ` [${item.risk_signals.join(', ')}]` : ''
  return [
    `• ${item.source_name} | ${item.category} | trust=${item.trust_level}`,
    `    ${item.title}`,
    `    ${item.url}${signals}`
  ].join('\n')
}

export function renderDigest(lines: DigestLine[]): string {
  return lines.map(l => l.text).join('\n')
}
