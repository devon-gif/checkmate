import { GlassCard } from './GlassCard'

const DEMO_LINES = [
  {
    id: 1,
    from: 'Unknown',
    text: 'Hi, I saw your CV online. We have an urgent opening — $85/hr remote. No experience needed. Send your info to claim your spot.',
    time: '2:17 PM',
    side: 'in' as const
  },
  {
    id: 2,
    from: 'You',
    text: 'Forwarding to CheckMate…',
    time: '2:18 PM',
    side: 'out' as const,
    faded: true
  }
]

const RESULT = {
  score: 82,
  level: 'HIGH' as const,
  flags: [
    'Unsolicited job offer with no company name',
    '"No experience needed" + unusually high pay',
    'Urgency language designed to pressure a quick response',
    'Request for personal information before any formal process'
  ],
  action:
    'Do not send personal information. If interested, research the company independently and verify through official job boards.'
}

function ScoreMeter({ score }: { score: number }) {
  const color = score >= 75 ? '#f87171' : score >= 50 ? '#fbbf24' : '#34d399'
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full border-2 text-xl font-bold"
        style={{ borderColor: color, color }}
      >
        {score}
      </div>
      <span className="text-xs font-medium" style={{ color }}>
        {RESULT.level}
      </span>
    </div>
  )
}

export function TextFirstDemo() {
  return (
    <section id="text-demo" className="px-6 py-20 lg:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-cm-green">
            See it in action
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Real example, real analysis.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/50">
            This is a simulated demo. CheckMate may surface possible risk
            signals like these — but can be wrong. Results are informational
            only.
          </p>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          {/* Message thread */}
          <GlassCard className="flex flex-col gap-3 p-6">
            <p className="mb-1 text-xs font-medium uppercase tracking-widest text-white/40">
              The message you received
            </p>
            {DEMO_LINES.map(line => (
              <div
                key={line.id}
                className={`flex ${
                  line.side === 'out' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={[
                    'max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                    line.side === 'out'
                      ? 'rounded-br-sm bg-white/10 text-white/40'
                      : 'rounded-bl-sm bg-white/5 text-white/70'
                  ].join(' ')}
                >
                  <p className="mb-1 text-[10px] font-medium text-white/30">
                    {line.from}
                  </p>
                  {line.text}
                  <p className="mt-1 text-right text-[10px] text-white/25">
                    {line.time}
                  </p>
                </div>
              </div>
            ))}
          </GlassCard>

          {/* Result card */}
          <GlassCard className="flex flex-col gap-5 p-6">
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-white/40">
                CheckMate result
              </p>
              <ScoreMeter score={RESULT.score} />
            </div>

            {/* Red flags */}
            <div>
              <p className="mb-3 text-sm font-medium text-white">
                Possible red flags
              </p>
              <ul className="space-y-2">
                {RESULT.flags.map(flag => (
                  <li
                    key={flag}
                    className="flex items-start gap-2 text-sm text-white/60"
                  >
                    <span className="mt-0.5 text-red-400/80">⚑</span>
                    {flag}
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommended action */}
            <div className="bg-cm-green/8 rounded-xl border border-cm-green/20 p-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-widest text-cm-green">
                Suggested next step
              </p>
              <p className="text-sm leading-relaxed text-white/70">
                {RESULT.action}
              </p>
            </div>

            <p className="text-center text-[11px] text-white/25">
              CheckMate can be wrong. Verify through official channels before
              acting.
            </p>
          </GlassCard>
        </div>
      </div>
    </section>
  )
}
