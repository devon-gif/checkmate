const messages = [
  {
    id: 1,
    side: 'out' as const,
    from: 'You',
    text: 'Is this recruiter legit?',
    time: '2:14 PM'
  },
  {
    id: 2,
    side: 'in' as const,
    from: 'Unknown sender',
    text: 'You\u2019re hired for a remote role. We\u2019ll send a check for equipment \u2014 deposit it and wire the difference back.',
    time: '2:14 PM'
  }
]

const redFlags = [
  'Upfront equipment purchase',
  'Text-only recruiter',
  'No verified company email'
]

export function RiskDemo() {
  return (
    <div className="absolute right-0 bottom-0 w-94 max-xl:right-0 max-xl:w-86 max-lg:static max-lg:w-full max-lg:max-w-110 max-lg:mt-10 max-md:max-w-full">
      {/* Message thread card */}
      <div className="relative p-5 mb-4 rounded-[1.25rem] bg-content shadow-1 backdrop-blur-[1.25rem]">
        <div className="absolute inset-0 border border-line rounded-[1.25rem] pointer-events-none" />
        <div className="mb-3 text-description-3 uppercase tracking-widest text-description">
          Forwarded to CheckMate
        </div>
        <div className="flex flex-col gap-2.5">
          {messages.map(m => (
            <div
              key={m.id}
              className={`flex ${m.side === 'out' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-description-2 ${
                  m.side === 'out'
                    ? 'bg-white/10 text-white/80 rounded-br-sm'
                    : 'bg-white/5 text-white/85 rounded-bl-sm'
                }`}
              >
                <div className="mb-0.5 text-description-3 text-description/70">
                  {m.from}
                </div>
                {m.text}
                <div className="mt-1 text-right text-description-3 text-description/50">
                  {m.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Result card */}
      <div className="relative p-5 rounded-[1.25rem] bg-content shadow-1 backdrop-blur-[1.25rem]">
        <div className="absolute inset-0 border border-line rounded-[1.25rem] pointer-events-none" />

        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-description-3 uppercase tracking-widest text-description">
              CheckMate result
            </div>
            <div className="mt-1.5 text-title-4 text-white max-md:text-title-3-mobile">
              Ghost job / scam risk
            </div>
          </div>
          <div className="relative flex flex-col items-center shrink-0">
            <div className="flex items-center justify-center w-14 h-14 rounded-full border-2 border-[#f87171] text-title-3 text-[#f87171]">
              92
            </div>
            <div className="mt-1 text-description-3 font-medium text-[#f87171]">
              HIGH
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-2 text-description-3 text-description">
            Possible red flags
          </div>
          <ul className="flex flex-col gap-1.5">
            {redFlags.map(f => (
              <li key={f} className="flex items-start gap-2 text-description-2 text-white/80">
                <span className="mt-1 w-1.5 h-1.5 shrink-0 rounded-full bg-[#f87171]" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          className="relative inline-flex justify-center items-center w-full h-9 px-3.5 rounded-lg bg-green text-title-5 text-black cursor-pointer transition-all hover:bg-green/90"
        >
          Draft a safe reply
        </button>


      </div>
    </div>
  )
}
