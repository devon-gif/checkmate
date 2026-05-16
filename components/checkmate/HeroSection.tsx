import { GradientButton } from './GradientButton'
import { HeroPhoneDemo } from './HeroPhoneDemo'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-24 lg:pb-32 lg:pt-32">
      {/* Layered decorative gradient orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 animate-pulse-glow rounded-full bg-cm-green/10 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-40 h-80 w-80 rounded-full bg-cm-green/10 blur-[90px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-60 h-80 w-80 rounded-full bg-teal-700/15 blur-[90px]"
      />

      {/* Subtle dotted-grid texture */}
      <div
        aria-hidden="true"
        className="cm-grid-bg pointer-events-none absolute inset-0"
      />

      {/* Content grid */}
      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        {/* Left column — copy */}
        <div className="text-center lg:text-left">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cm-green/30 bg-cm-green/10 px-4 py-1.5 text-xs font-medium text-cm-green">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cm-green" />
            Free risk checks — no account required
          </div>

          {/* Headline */}
          <h1 className="cm-text-gradient mb-6 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl xl:text-[4.25rem]">
            Not sure if it&apos;s real?{' '}
            <span className="block text-cm-green">Ask Ray.</span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg lg:mx-0">
            CheckRay helps you text, forward, paste, or upload suspicious
            messages, job posts, links, bills, and emails. Ray gives you a
            risk score, common red flags, and what to do next.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 lg:justify-start">
            <GradientButton href="/try" variant="primary">
              Try a free check
            </GradientButton>
            <GradientButton href="#text-demo" variant="secondary">
              See how Ray works
            </GradientButton>
          </div>

          {/* Trust strip */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[11px] uppercase tracking-widest text-white/35 lg:justify-start">
            <span className="inline-flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-cm-green/70" />
              Works by text
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-cm-green/70" />
              Works by email
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-cm-green/70" />
              Works on web
            </span>
          </div>

          {/* Supporting line */}
          <p className="mt-6 text-xs leading-relaxed text-white/40 lg:max-w-md">
            Save CheckRay to your home screen when you&apos;re ready. Ray can
            be wrong — results are informational only, not legal, financial,
            or medical advice.
          </p>
        </div>

        {/* Right column — phone demo */}
        <div className="relative mx-auto w-full max-w-md">
          {/* Conic glow ring behind phone */}
          <div
            aria-hidden="true"
            className="cm-conic-glow pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 blur-2xl"
          />

          {/* Phone */}
          <div className="relative">
            <HeroPhoneDemo />

            {/* Floating Ray's-read chip */}
            <div className="cm-glass absolute -right-2 -top-3 hidden rounded-2xl px-4 py-3 shadow-[0_0_30px_rgba(122,226,207,0.2)] sm:block lg:-right-6">
              <p className="text-[10px] font-medium uppercase tracking-widest text-cm-green">
                Ray&rsquo;s read
              </p>
              <p className="mt-1 flex items-baseline gap-1 text-sm font-semibold text-white">
                High Risk{' '}
                <span className="text-xs text-white/40">· 87/100</span>
              </p>
            </div>

            {/* Floating "verify" pill */}
            <div className="cm-glass absolute -bottom-4 -left-3 hidden items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-medium text-white/70 shadow-[0_0_24px_rgba(0,0,0,0.4)] sm:inline-flex lg:-left-6">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cm-green" />
              Verify through official channels
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
