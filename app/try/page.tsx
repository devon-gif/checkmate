import { GlassCard } from '@/components/checkmate/GlassCard'
import { NewCaseForm } from '@/app/cases/new/new-case-form'

export const metadata = {
  title: 'Free Risk Check | CheckRay',
  description:
    'Paste a suspicious message, link, or listing and ask Ray for an instant risk report. No account required.'
}

export default function TryPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      {/* Header */}
      <div className="space-y-2">
        <span className="inline-block rounded-full border border-cm-green/30 bg-cm-green/10 px-3 py-1 text-xs font-medium text-cm-green">
          No account needed
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Ask Ray for a free risk check
        </h1>
        <p className="text-sm leading-6 text-white/50">
          Paste a suspicious text, email, bill, job offer, or link below. Ray
          reads it and gives you a plain-English risk report.{' '}
          <span className="text-white/30">
            Create a free CheckRay account to save results and track your
            cases.
          </span>
        </p>
      </div>

      {/* Form card */}
      <GlassCard className="p-8">
        <NewCaseForm />
      </GlassCard>
    </div>
  )
}
