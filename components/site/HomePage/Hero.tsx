'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

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
    text:
      'You\u2019re hired for a remote role. We\u2019ll send a check for equipment — deposit it and wire the difference back.',
    time: '2:14 PM'
  }
]

const redFlags = [
  'Upfront equipment purchase',
  'Text-only recruiter',
  'No verified company email'
]

function RiskDemo() {
  return (
    <div className="absolute right-0 bottom-0 w-94 max-xl:right-0 max-xl:w-86 max-lg:static max-lg:w-full max-lg:max-w-110 max-lg:mt-10 max-md:max-w-full">
      {/* Message thread card */}
      <div className="relative p-5 mb-4 rounded-[1.25rem] bg-content shadow-1 backdrop-blur-[1.25rem]">
        <div className="absolute inset-0 border border-line rounded-[1.25rem] pointer-events-none" />
        <div className="mb-3 text-description-3 uppercase tracking-widest text-description">
          Forwarded to Ray
        </div>
        <div className="flex flex-col gap-2.5">
          {messages.map(m => (
            <div
              key={m.id}
              className={`flex ${
                m.side === 'out' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-description-2 ${
                  m.side === 'out'
                    ? 'bg-white/10 text-white/80 rounded-br-sm'
                    : 'bg-white/5 text-white/85 rounded-bl-sm'
                }`}
              >
                <div className="mb-0.5 text-description-3 text-white/45">
                  {m.from}
                </div>
                {m.text}
                <div className="mt-1 text-right text-description-3 text-white/35">
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
              Ray&rsquo;s read
            </div>
            <div className="mt-1.5 text-title-4 text-white max-md:text-title-3-mobile">
              Possible job scam
            </div>
          </div>
          <div className="relative flex flex-col items-center shrink-0">
            <div className="flex items-center justify-center size-14 rounded-full border-2 border-[#f87171] text-title-3 text-[#f87171]">
              92
            </div>
            <div className="mt-1 text-description-3 font-medium text-[#f87171]">
              HIGH
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-2 text-description-3 text-description">
            Ray found these red flags
          </div>
          <ul className="flex flex-col gap-1.5">
            {redFlags.map(f => (
              <li
                key={f}
                className="flex items-start gap-2 text-description-2 text-white/80"
              >
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[#f87171]" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          className="relative inline-flex justify-center items-center w-full h-9 px-3.5 rounded-lg bg-green text-title-5 text-deep cursor-pointer transition-all hover:bg-green/90"
        >
          Draft a safer reply
        </button>

        <div className="mt-3 text-center text-description-3 text-white/45">
          Ray can be wrong. Verify through official channels.
        </div>
      </div>
    </div>
  )
}

export default function Hero() {
  return (
    <div className="relative pt-58 pb-20 max-xl:pt-48 max-lg:pt-44 max-md:pt-21 max-md:pb-15">
      <motion.div
        className="center relative z-[3]"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-187">
          <div className="mb-4 inline-flex items-center gap-2 text-title-3 text-green max-md:text-[14px] max-md:mb-2">
            <span className="size-1.5 rounded-full bg-green animate-pulse" />
            Free risk checks — no account required
          </div>
          <div className="mb-41 text-big-title-1 bg-radial-white-1 bg-clip-text text-transparent max-xl:text-big-title-2 max-lg:text-title-1 max-lg:mb-10 max-md:mb-[34rem] max-md:text-big-title-mobile">
            Not sure if it&rsquo;s real?
            <br />
            Ask Ray.
          </div>
          <div className="absolute right-20 bottom-72 max-w-44 flex flex-col gap-44 text-right text-title-5 text-green max-xl:right-10 max-xl:gap-30 max-lg:static max-lg:gap-6 max-lg:mb-8 max-lg:text-left max-md:gap-10 max-md:mb-13 max-md:text-title-3-mobile">
            <div>Spot possible scams, ghost jobs, and shady bills in seconds</div>
            <div>Risk score, common red flags, and what to do next</div>
          </div>
          <div className="max-w-110 mb-9.5 text-description max-lg:max-w-88 max-md:max-w-full max-md:mb-6">
            CheckRay helps you text, forward, paste, or upload suspicious
            messages, job posts, links, bills, and emails. Ray gives you a
            risk score, common red flags, and what to do next.
          </div>
          <div className="flex flex-wrap items-center gap-3 mb-6 max-md:mb-4">
            <Link
              href="/try"
              className="relative inline-flex justify-center items-center h-10 px-4 rounded-lg bg-white text-title-5 text-deep cursor-pointer transition-all hover:bg-white/90"
            >
              Try a free check
            </Link>
            <Link
              href="#how-it-works"
              className="relative inline-flex justify-center items-center h-10 px-4 rounded-lg text-title-5 text-white cursor-pointer transition-all after:absolute after:inset-0 after:border after:border-line after:rounded-lg after:pointer-events-none hover:after:border-white/40"
              style={{
                boxShadow:
                  '0.0625rem 0.0625rem 0.0625rem 0 rgba(255,255,255,0.10) inset'
              }}
            >
              See how Ray works
            </Link>
          </div>
          <div className="max-w-110 text-description-3 text-description max-md:mb-8">
            Works by text, email, or web. Save CheckRay to your home screen
            when you&rsquo;re ready. Ray can be wrong — results are
            informational only.
          </div>
          <RiskDemo />
        </div>
      </motion.div>
      {/* Right-side video orb (premium ambient visual) */}
      <div className="absolute top-23 right-[calc(50%-28.5rem)] size-178 rounded-full max-xl:size-140 max-md:top-36 max-md:right-auto max-md:left-8.5 max-md:size-133">
        <div className="absolute -inset-[10%] mask-radial">
          <video
            className="w-full"
            src="/videos/video-1.mp4"
            autoPlay
            loop
            muted
            playsInline
          />
        </div>
        <div className="absolute inset-0 rounded-full bg-deep/[0.01]" style={{ boxShadow: '0.875rem 1.0625rem 1.25rem 0 rgba(255,255,255,0.25) inset' }} />
      </div>
      {/* Ambient green blooms */}
      <div>
        <div className="absolute top-61.5 right-[calc(50%-35.18rem)] z-[2] size-116.5 bg-green/20 rounded-full blur-[8rem] max-md:top-36 max-lg:-right-96 max-md:left-74 max-md:right-auto" />
        <div className="absolute top-77 left-[calc(50%-57.5rem)] z-[2] size-116.5 bg-green/20 rounded-full blur-[8rem] max-lg:-left-60 max-md:top-84 max-md:-left-52 max-md:size-80" />
      </div>
    </div>
  )
}
