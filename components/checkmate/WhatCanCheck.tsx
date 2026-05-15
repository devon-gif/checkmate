import { GlassCard } from './GlassCard'

const categories = [
  {
    icon: '📱',
    label: 'Suspicious texts',
    examples: [
      'Fake prize notices',
      'Delivery scam SMS',
      '"Your account is locked"'
    ]
  },
  {
    icon: '💼',
    label: 'Job offers',
    examples: [
      'Work-from-home listings',
      'Upfront payment requests',
      'Vague role descriptions'
    ]
  },
  {
    icon: '🔗',
    label: 'Links & URLs',
    examples: ['Phishing links', 'Lookalike domains', 'Shortened URLs']
  },
  {
    icon: '🧾',
    label: 'Bills & invoices',
    examples: [
      'Unexpected charges',
      'Unfamiliar vendor names',
      'Pressure to pay quickly'
    ]
  },
  {
    icon: '📧',
    label: 'Emails',
    examples: [
      'Impersonation emails',
      'Urgent wire requests',
      'Fake login alerts'
    ]
  },
  {
    icon: '🏠',
    label: 'Rental listings',
    examples: [
      'Too-good-to-be-true rent',
      'Overseas landlord stories',
      'No in-person showing'
    ]
  },
  {
    icon: '🛒',
    label: 'Marketplace messages',
    examples: [
      'Overpayment scams',
      'Unusual payment methods',
      'Shipping fee tricks'
    ]
  },
  {
    icon: '📄',
    label: 'Documents & screenshots',
    examples: ['Fake contracts', 'Altered cheques', 'Spoofed ID images']
  }
]

export function WhatCanCheck() {
  return (
    <section className="px-6 py-20 lg:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-cm-green">
            What CheckMate can check
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            If something feels off, we can help.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/50">
            CheckMate may identify possible risk signals across a wide range of
            messages and content — though it can be wrong. Always verify through
            official channels before acting.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map(cat => (
            <GlassCard
              key={cat.label}
              className="flex flex-col gap-3 p-5 transition-all duration-300 hover:-translate-y-1"
              glow
            >
              <span className="text-2xl" role="img" aria-label={cat.label}>
                {cat.icon}
              </span>
              <h3 className="text-sm font-medium text-white">{cat.label}</h3>
              <ul className="space-y-1">
                {cat.examples.map(ex => (
                  <li
                    key={ex}
                    className="text-white/45 flex items-start gap-1.5 text-xs"
                  >
                    <span className="mt-0.5 text-cm-green/60">›</span>
                    {ex}
                  </li>
                ))}
              </ul>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  )
}
