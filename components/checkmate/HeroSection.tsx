import { GradientButton } from './GradientButton'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-6 pt-28 pb-24 text-center lg:pt-36 lg:pb-32">
      {/* Decorative gradient glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-cm-green/10 blur-[100px] animate-pulse-glow"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-40 h-80 w-80 rounded-full bg-cm-green/8 blur-[80px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-60 h-80 w-80 rounded-full bg-teal-700/10 blur-[80px]"
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-3xl">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cm-green/30 bg-cm-green/10 px-4 py-1.5 text-xs font-medium text-cm-green">
          <span className="h-1.5 w-1.5 rounded-full bg-cm-green animate-pulse" />
          Free risk checks — no account required
        </div>

        {/* Headline */}
        <h1 className="mb-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl cm-text-gradient">
          Not sure if it&apos;s real?{' '}
          <span className="block text-cm-green">Send it to CheckMate.</span>
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">
          Text, forward, paste, or upload suspicious messages, job posts, links,
          bills, and emails. CheckMate gives you a risk score, common red flags,
          and what to do next.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <GradientButton href="/cases/new" variant="primary">
            Try a free check
          </GradientButton>
          <GradientButton href="#text-demo" variant="secondary">
            See how texting works
          </GradientButton>
        </div>

        {/* Supporting line */}
        <p className="mt-8 text-xs text-white/40">
          Works by text, email, or web. Save it to your home screen when
          you&apos;re ready.
        </p>
      </div>
    </section>
  )
}
