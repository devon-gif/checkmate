import { GlassCard } from './GlassCard'

const steps = [
  {
    number: '01',
    title: 'Send it to CheckMate',
    description:
      'Text a suspicious message to our number, forward an email, paste it on the web, or upload a screenshot. Any channel works.',
    icon: '📨'
  },
  {
    number: '02',
    title: 'We scan for risk signals',
    description:
      'CheckMate checks for common red flags — unusual links, urgency tactics, impersonation patterns, and other signals that may be suspicious.',
    icon: '🔍'
  },
  {
    number: '03',
    title: 'Get a plain-English readout',
    description:
      'You receive a risk score, a list of red flags we noticed, and suggested next steps — so you can decide what to do without the guesswork.',
    icon: '✅'
  }
]

export function HowItWorks() {
  return (
    <section className="px-6 py-20 lg:py-28">
      <div className="mx-auto max-w-5xl">
        {/* Heading */}
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-cm-green">
            How it works
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Three steps. No tech skills required.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/50">
            CheckMate is designed to be as simple as sending a text — because
            that&apos;s often exactly what it is.
          </p>
        </div>

        {/* Steps */}
        <div className="relative grid gap-6 md:grid-cols-3">
          {/* Connector line (desktop) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[calc(33.33%-1px)] top-10 hidden h-px bg-gradient-to-r from-transparent via-cm-green/30 to-transparent md:block"
          />

          {steps.map(step => (
            <GlassCard
              key={step.number}
              className="flex flex-col gap-4 p-6 transition-all duration-300 hover:-translate-y-1"
              glow
            >
              {/* Icon & number */}
              <div className="flex items-start justify-between">
                <span className="text-3xl" role="img" aria-label={step.title}>
                  {step.icon}
                </span>
                <span className="font-mono text-xs text-cm-green/50">
                  {step.number}
                </span>
              </div>

              {/* Text */}
              <div>
                <h3 className="mb-2 text-base font-medium text-white">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-white/50">
                  {step.description}
                </p>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  )
}
