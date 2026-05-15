import Link from 'next/link'

export function LegalPage({
  title,
  version,
  effectiveDate,
  children,
}: {
  title: string
  version: string
  effectiveDate: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <div className="mb-8 border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Version {version} &middot; Effective {effectiveDate}
        </p>
      </div>
      <div className="space-y-8">{children}</div>
      <div className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        <LegalFooterLinks />
      </div>
    </div>
  )
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}

export function LawyerNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs italic text-yellow-700 dark:text-yellow-400">
      ⚠️ {children}
    </p>
  )
}

export function LegalFooterLinks() {
  const links = [
    { href: '/terms', label: 'Terms' },
    { href: '/privacy', label: 'Privacy' },
    { href: '/disclaimer', label: 'Disclaimer' },
    { href: '/ai-disclosure', label: 'AI Disclosure' },
    { href: '/acceptable-use', label: 'Acceptable Use' },
    { href: '/contact', label: 'Contact' },
  ]
  return (
    <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1">
      {links.map(l => (
        <Link key={l.href} href={l.href} className="hover:text-foreground hover:underline">
          {l.label}
        </Link>
      ))}
    </nav>
  )
}
