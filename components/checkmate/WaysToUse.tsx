import { GlassCard } from './GlassCard'

const channels = [
  {
    icon: '💬',
    label: 'Text message',
    description:
      'Text or forward the suspicious message to CheckMate. Get a reply within seconds.',
    badge: 'Most popular'
  },
  {
    icon: '📧',
    label: 'Email forward',
    description:
      'Forward the email to CheckMate. It reads the headers and body for risk signals.',
    badge: null
  },
  {
    icon: '🖥️',
    label: 'Web paste',
    description:
      'Paste text, a URL, or upload a screenshot directly on this site. No sign-in required.',
    badge: null
  },
  {
    icon: '📱',
    label: 'Home screen app',
    description:
      'Add CheckMate to your home screen for one-tap access when something feels off.',
    badge: 'Coming soon'
  }
]

export function WaysToUse() {
  return (
    <section className="relative px-6 py-20 lg:py-28">
      {/* Background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center"
      >
        <div className="h-96 w-96 rounded-full bg-cm-green/8 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-cm-green">
            Ways to use CheckMate
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            However you got the message,{' '}
            <br className="hidden sm:block" />
            CheckMate can help.
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {channels.map(channel => (
            <GlassCard
              key={channel.label}
              className="relative flex flex-col gap-3 p-5 transition-all duration-300 hover:-translate-y-1"
              glow
            >
              {channel.badge && (
                <span className="absolute right-4 top-4 rounded-full bg-cm-green/15 px-2 py-0.5 text-[10px] font-medium text-cm-green">
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
