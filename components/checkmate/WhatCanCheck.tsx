import { GlassCard } from './GlassCard'

const categories = [
  {
    icon: '📱',
    label: 'Scam texts',
    examples: [
      'Fake prize notices',
      'Delivery scam SMS',
      '"Your account is locked"'
    ]
  },
  {
    icon: '💼',
    label: 'Ghost jobs and recruiter messages',
    examples: [
      'Vague role descriptions',
      'Upfront equipment fees',
      'Text-only recruiters'
    ]
  },
  {
    icon: '🔗',
    label: 'Suspicious links',
    examples: ['Phishing links', 'Lookalike domains', 'Shortened URLs']
  },
  {
    icon: '🧾',
    label: 'Bills and fees',
    examples: [
      'Unexpected charges',
      'Unfamiliar vendor names',
      'Pressure to pay quickly'
    ]
  },
  {
    icon: '🏠',
    label: 'Rental or marketplace messages',
    examples: [
      'Too-good-to-be-true rent',
      'Overpayment scams',
      'Unusual payment methods'
    ]
  },
  {
    icon: '�',
    label: 'Forwarded emails',
    examples: [
      'Impersonation emails',
      'Urgent wire requests',
      'Fake login alerts'
    ]
  }
]

export function WhatCanCheck() {
  return (
    <section className="px-6 py-20 lg:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-cm-green">
            What Ray can check
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            If something feels off, Ray can help.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/50">
            Ray checks for risk signals in suspicious texts, links, jobs,
            bills, and emails.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
