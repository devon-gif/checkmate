'use client'

import { motion } from 'framer-motion'

const steps = [
  {
    num: '01',
    title: 'Send it to Ray',
    body: 'Paste a message, link, screenshot, or job post.'
  },
  {
    num: '02',
    title: 'Ray checks for red flags',
    body: 'Ray looks for fake-check patterns, urgency, impersonation, suspicious payment asks, sketchy domains, and ghost-job signals.'
  },
  {
    num: '03',
    title: 'Get a plain-English answer',
    body: 'See the risk score, common red flags, and what to do next.'
  }
]

const cardBase =
  'relative rounded-[1.25rem] bg-content shadow-2 backdrop-blur-[1.25rem] after:absolute after:inset-0 after:border after:border-line after:rounded-[1.25rem] after:pointer-events-none'

export default function Details() {
  return (
    <div
      id="how-it-works"
      className="pt-40.5 pb-30.5 max-xl:pt-30 max-lg:py-24 max-md:py-15"
    >
      <div className="center">
        <div className="max-w-148 mx-auto mb-14 text-center max-md:mb-8">
          <div className="label mb-3 max-md:mb-1">How it works</div>
          <div className="mb-4 bg-radial-white-2 bg-clip-text text-transparent text-title-1 max-lg:text-title-2 max-md:text-title-1-mobile">
            Three steps. No tech skills required.
          </div>
          <div className="text-description">
            Forward a message, paste a link, or upload a screenshot. Ray looks for common
            risk signals and gives you a plain-English readout.
          </div>
        </div>

        {/* Step cards */}
        <div className="flex gap-4 max-lg:flex-col">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              className={`${cardBase} flex-1 p-8 max-xl:p-7 max-md:p-6`}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1, duration: 0.6 }}
              viewport={{ amount: 0.4 }}
            >
              <div
                className="mb-6 font-light leading-none text-white/10 max-md:mb-4"
                style={{ fontSize: 'clamp(2.5rem, 4vw, 3.5rem)' }}
              >
                {step.num}
              </div>
              <div className="mb-3 text-title-4 text-white max-md:text-title-2-mobile">
                {step.title}
              </div>
              <div className="text-description">{step.body}</div>
            </motion.div>
          ))}
        </div>

        {/* Stat bar */}
        <motion.div
          className={`${cardBase} mt-4 flex items-center gap-10 px-10 py-6 max-md:flex-col max-md:gap-5 max-md:text-center max-md:px-6 max-md:py-5`}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          viewport={{ amount: 0.5 }}
        >
          <div className="flex items-center gap-4 max-md:flex-col max-md:gap-2">
            <div
              className="relative flex justify-center items-center shrink-0 size-12 rounded-lg"
              style={{
                background: 'linear-gradient(to bottom, #42B39E, #1B8C77)',
                boxShadow: '0 0 20px rgba(122,226,207,0.3)'
              }}
            >
              <svg width="14" height="20" viewBox="0 0 14 20" fill="none">
                <path d="M8 1L1 11H7L6 19L13 9H7L8 1Z" fill="white" stroke="white" strokeWidth="0.5" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="bg-radial-white-2 bg-clip-text text-transparent text-title-1 max-xl:text-title-2">
              ~3s
            </span>
            <span className="text-description">Average risk readout</span>
          </div>
          <div className="h-12 w-px bg-white/8 max-md:hidden" />
          <div className="flex items-center gap-4 max-md:flex-col max-md:gap-2">
            <span className="bg-radial-white-2 bg-clip-text text-transparent text-title-1 max-xl:text-title-2">
              100%
            </span>
            <span className="text-description max-w-64">
              Informational only. Ray can be wrong. Verify through official channels before acting.
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
