import { GradientButton } from './GradientButton'

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden px-6 py-24 lg:py-32">
      {/* Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center"
      >
        <div className="h-64 w-[600px] rounded-full bg-cm-green/10 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-cm-green">
          Ready to check something?
        </p>
        <h2 className="mb-6 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Before you reply, ask Ray.
        </h2>
        <p className="mb-10 text-base leading-relaxed text-white/50">
          One quick check can help you spot possible red flags before you act.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <GradientButton href="/try" variant="primary">
            Try a free check
          </GradientButton>
          <GradientButton href="/sign-up" variant="secondary">
            Create a free account
          </GradientButton>
        </div>

        <p className="mt-8 text-xs text-white/30">
          No credit card. No account required for your first check.
        </p>
      </div>
    </section>
  )
}
