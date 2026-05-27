'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { fadeUp, fadeIn, staggerContainer } from '@/lib/animations'

const redFlags = [
  'Recruiter only texts',
  'Asked to reply "YES" or "INTERESTED"',
  'Equipment deposit or fake check',
  'Vague company details',
  'High pay, low detail',
  'Pressure to act today'
]

export default function GhostJobSection() {
  return (
    <div
      id="ghost-jobs"
      className="relative py-24 max-xl:py-20 max-lg:py-16 max-md:py-12"
    >
      {/* Ambient glows */}
      <div className="pointer-events-none absolute top-0 left-[calc(50%-36rem)] -z-10 size-[30rem] rounded-full bg-green/10 blur-[7rem] max-md:hidden" />
      <div className="pointer-events-none absolute bottom-0 right-[calc(50%-36rem)] -z-10 size-[30rem] rounded-full bg-green/8 blur-[7rem] max-md:hidden" />

      <div className="center relative z-[2]">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center max-lg:gap-10">

          {/* Left: copy */}
          <motion.div
            variants={fadeIn}
            initial="initial"
            whileInView="animate"
            viewport={{ amount: 0.4, once: true }}
          >
            <div className="label mb-3 max-md:mb-1">Ghost jobs &amp; fake recruiters</div>
            <h2
              className="mb-5 bg-radial-white-2 bg-clip-text text-transparent max-md:mb-4"
              style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', lineHeight: 1.1, letterSpacing: '-0.025em', fontWeight: 500 }}
            >
              Fake jobs are getting harder to ignore.
            </h2>
            <p className="mb-6 text-description leading-relaxed max-w-lg">
              A recruiter texts you. The role sounds remote and flexible. They want a fast reply, a deposit, or a move to WhatsApp. Maybe it&apos;s real. Maybe it&apos;s not. Ray checks for fake-recruiter patterns, ghost-job signals, equipment-payment scams, and risky hiring language before you waste time or send money.
            </p>
            <p className="mb-8 text-[13px] text-white/40 italic max-md:mb-6">
              Don&apos;t ignore a real opportunity. Don&apos;t walk into a fake one.
            </p>
            <Link
              href="/try"
              className="inline-flex items-center justify-center h-11 px-6 rounded-xl text-title-5 text-white cursor-pointer transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #FF7A6B 0%, #FF9B5E 100%)',
                boxShadow: '0 0 24px rgba(255,112,90,0.45), inset 0 1px 0 rgba(255,255,255,0.15)'
              }}
            >
              Check a job offer
            </Link>
          </motion.div>

          {/* Right: red flags card */}
          <motion.div
            variants={fadeUp}
            initial="initial"
            whileInView="animate"
            viewport={{ amount: 0.3, once: true }}
          >
            <div
              className="relative rounded-[1.25rem] p-7 after:absolute after:inset-0 after:rounded-[1.25rem] after:border after:border-line after:pointer-events-none"
              style={{
                background: 'rgba(122,226,207,0.03)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 0 0 1px rgba(122,226,207,0.10), 0 32px 64px rgba(0,0,0,0.35), 0 0 48px rgba(122,226,207,0.06)'
              }}
            >
              <div className="mb-5">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-white/35 mb-1">
                  Common warning signs
                </div>
                <div className="text-[15px] font-semibold text-white">
                  Red flags Ray looks for
                </div>
              </div>
              <motion.ul
                className="space-y-3"
                variants={staggerContainer}
                initial="initial"
                whileInView="animate"
                viewport={{ amount: 0.3, once: true }}
              >
                {redFlags.map((flag, i) => (
                  <motion.li
                    key={i}
                    variants={fadeUp}
                    className="flex items-start gap-3"
                  >
                    <div
                      className="mt-[3px] size-2 shrink-0 rounded-full"
                      style={{ background: '#f87171', boxShadow: '0 0 6px rgba(239,68,68,0.5)' }}
                    />
                    <span className="text-[13px] text-white/65 leading-snug">{flag}</span>
                  </motion.li>
                ))}
              </motion.ul>

              {/* Disclaimer line */}
              <p className="mt-6 text-[11px] leading-5 text-white/28 border-t border-white/8 pt-4">
                Ray can be wrong. If something feels off, verify through official company channels before acting.
              </p>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  )
}
