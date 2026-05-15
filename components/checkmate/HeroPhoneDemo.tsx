export function HeroPhoneDemo() {
  const messages = [
    {
      id: 1,
      direction: 'in' as const,
      text: 'Congratulations! You have been selected for a $500 Walmart gift card. Click here to claim: bit.ly/g1ft-cl41m',
      time: '10:42 AM'
    },
    {
      id: 2,
      direction: 'out' as const,
      text: 'Forwarded to CheckMate…',
      time: '10:43 AM',
      faded: true
    },
    {
      id: 3,
      direction: 'in' as const,
      isCheckMate: true,
      text: '⚠️ Risk score: 87/100 — HIGH\n\nRed flags:\n• Unsolicited prize claim\n• Shortened URL hiding destination\n• Urgent "claim now" pressure\n\nRecommended: Do not click. Delete the message.',
      time: '10:43 AM'
    }
  ]

  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      {/* Phone frame */}
      <div className="relative rounded-[2.5rem] border border-white/15 bg-[#0a1520] px-3 py-8 shadow-[0_0_60px_rgba(122,226,207,0.15)]">
        {/* Notch */}
        <div className="mx-auto mb-4 h-5 w-24 rounded-full bg-white/10" />

        {/* Status bar */}
        <div className="mb-3 flex items-center justify-between px-2 text-[10px] text-white/40">
          <span>10:43</span>
          <span>CheckMate ·</span>
          <span>●●●</span>
        </div>

        {/* Messages */}
        <div className="flex flex-col gap-2.5 px-1">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.direction === 'out' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={[
                  'max-w-[85%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed whitespace-pre-line',
                  msg.direction === 'out'
                    ? 'rounded-br-sm bg-white/10 text-white/50'
                    : msg.isCheckMate
                      ? 'rounded-bl-sm border border-cm-green/30 bg-cm-green/10 text-white/80'
                      : 'rounded-bl-sm bg-white/5 text-white/60'
                ].join(' ')}
              >
                {msg.isCheckMate && (
                  <span className="mb-1 block font-medium uppercase tracking-widest text-[9px] text-cm-green">
                    CheckMate
                  </span>
                )}
                {msg.text}
                <span className="mt-1 block text-right text-[9px] text-white/30">
                  {msg.time}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Home bar */}
        <div className="mx-auto mt-6 h-1 w-20 rounded-full bg-white/20" />
      </div>

      {/* Glow under phone */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-10 left-1/2 h-32 w-56 -translate-x-1/2 rounded-full bg-cm-green/15 blur-[40px]"
      />
    </div>
  )
}
