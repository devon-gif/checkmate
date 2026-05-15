import { GlassCard } from './GlassCard'

const channels = [
  {
    icon: '💬',
    label: 'Text Ray',
    description: 'Send suspicious texts, links, or screenshots.',
    badge: 'Most popular'
  },
  {
    icon: '📧',
    label: 'Forward Email',
    description: 'Forward questionable emails, notices, or bills.',
    badge: null
  },
  {
    icon: '�',
    label: 'Paste a Link',
    description:
      'Ask Ray to check job posts, payment pages, package links, and more.',
    badge: null
  },
  {
    icon: '🧾',
    label: 'Upload a Bill',
    description: 'Review fees, final notices, PDFs, and screenshots.',
    badge: null
  },
  {
    icon: '📱',
    label: 'Save to Home Screen',
    description:
      'Use CheckRay like an app without an app store download.',
    badge: 'Coming soon'
  }
]

export function WaysToUse() {
  return (
    <section className="relative px-6 py-20 lg:py-28">
      {/* Background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center"
      >
        <div className="bg-cm-green/8 h-96 w-96 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-cm-green">
            Ways to use CheckRay
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            However the message arrived,{' '}
            <br className="hidden sm:block" />
            Ray can help.
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map(channel => (
            <GlassCard
              key={channel.label}
              className="relative flex flex-col gap-3 p-5 transition-all duration-300 hover:-translate-y-1"
              glow
            >
              {channel.badge && (
                <span className="bg-cm-green/15 absolute right-4 top-4 rounded-full px-2 py-0.5 text-[10px] font-medium text-cm-green">
                  {channel.badge}
                </span>
              )}
              <span className="text-2xl" role="img" aria-label={channel.label}>
                {channel.icon}
              </span>
              <div>
                <h3 className="mb-1 text-sm font-medium text-white">
                  {channel.label}
                </h3>
                <p className="text-xs leading-relaxed text-white/50">
                  {channel.description}
                </p>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  )
}
