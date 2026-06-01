import Link from 'next/link'

/**
 * Tab nav shared by the Scam Intelligence admin pages.
 *   patterns → /admin/scam-intel        (curated catalog)
 *   sources  → /admin/scam-intel/sources (raw source intake / review queue)
 */
export function ScamIntelTabs({ active }: { active: 'patterns' | 'sources' }) {
  const tabs = [
    { id: 'patterns', label: 'Patterns', href: '/admin/scam-intel' },
    { id: 'sources', label: 'Sources & review', href: '/admin/scam-intel/sources' }
  ] as const

  return (
    <div className="flex gap-2 border-b border-white/10 pb-px">
      {tabs.map(t => (
        <Link
          key={t.id}
          href={t.href}
          className={[
            'rounded-t-lg border-b-2 px-4 py-2 text-sm transition',
            t.id === active
              ? 'border-cm-green text-white'
              : 'border-transparent text-white/40 hover:text-white/70'
          ].join(' ')}
        >
          {t.label}
        </Link>
      ))}
    </div>
  )
}
