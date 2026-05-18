'use client'

/**
 * components/site/HomePage/ScamWatch.tsx
 *
 * Homepage section announcing the weekly Scam Watch email.
 * Visual style follows the existing premium dark glassmorphism used
 * by WaysToUse / Pricing / Details. Placed between WaysToUse and
 * Pricing in app/page.tsx.
 *
 * NOTE: This is messaging only. The actual email cron/sender is
 * tracked in NOTIFICATIONS_TODO.md and is not built yet.
 */

import { motion } from 'framer-motion'

const bullets = [
  'New scam patterns every week',
  'Ghost job and fake recruiter alerts',
  'Phishing text and suspicious link warnings',
  'Simple steps to verify before you act'
]

const checkSvg = (
  <svg
    className="size-3.5 fill-deep"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    aria-hidden="true"
  >
    <path d="M13.47 6.97A.75.75 0 0 1 14.53 8.03l-5 5a.75.75 0 0 1-1.061 0l-3-3A.75.75 0 0 1 6.53 8.97L9 11.439l4.47-4.469z" />
  </svg>
)

export default function ScamWatch() {
  return (
    <div
      id="scam-watch"
      className="relative pt-20 pb-20 max-xl:pt-16 max-xl:pb-16 max-lg:py-14 max-md:py-10"
    >
      <div className="center relative z-[2]">
        <motion.div
          className="relative mx-auto max-w-[64rem] overflow-hidden rounded-[1.5rem] p-10 max-lg:p-8 max-md:p-6 after:absolute after:inset-0 after:border after:border-line after:rounded-[1.5rem] after:pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(122,226,207,0.06) 0%, rgba(12,24,37,0.55) 60%)',
            backdropFilter: 'blur(20px)',
            boxShadow:
              '0 0 60px rgba(122,226,207,0.10), inset 0 1px 0 rgba(255,255,255,0.06)'
          }}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ amount: 0.3, once: true }}
        >
          {/* Soft mint orb */}
          <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-green/15 blur-[6rem] max-md:hidden" />

          <div className="relative z-[2] grid gap-10 md:grid-cols-[1fr_1fr] md:items-center max-md:gap-6">
            {/* Left: title + description + small note */}
            <div>
              <div className="label mb-3 max-md:mb-2">Weekly emails</div>
              <h2 className="mb-4 bg-radial-white-2 bg-clip-text text-transparent text-title-2 max-lg:text-title-3 max-md:text-title-1-mobile max-md:mb-3">
                Ray&apos;s Weekly Scam Watch
              </h2>
              <p className="text-description max-md:text-description-mobile">
                Get a weekly email with dangerous scam patterns, ghost jobs,
                phishing links, suspicious bills, and red flags to watch for
                before you click, pay, reply, or apply.
              </p>
              <p className="mt-4 text-[11px] leading-5 text-white/35">
                Alerts are informational only. Ray can be wrong. Always verify
                through official sources.
              </p>
            </div>

            {/* Right: bulleted feature list */}
            <ul className="flex flex-col gap-3">
              {bullets.map(text => (
                <li
                  key={text}
                  className="flex items-start gap-3 text-description max-md:text-description-mobile"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green shadow-[0.0625rem_0.0625rem_0.0625rem_0_rgba(255,255,255,0.20)_inset,_0_0_0.625rem_0_rgba(255,255,255,0.50)_inset]">
                    {checkSvg}
                  </span>
                  <span className="text-white/80">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
