'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { fadeUp, fadeIn, staggerContainer } from '@/lib/animations'

const stats = [
  {
    value: '$12.5B',
    label: 'reported lost to fraud by U.S. consumers in 2024'
  },
  {
    value: '$16.6B',
    label: 'reported cyber-enabled losses to FBI IC3 in 2024'
  },
  {
    value: '$501M',
    label: 'reported job and employment agency scam losses in 2024'
  },
  {
    value: '38%',
    label: 'of fraud reporters lost money in 2024, up from 27% in 2023'
  }
]

export default function StatsBar() {
  return (
    <div className="relative py-20 max-lg:py-16 max-md:py-12">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-x-[20%] top-0 -z-10 h-full rounded-full bg-green/8 blur-[6rem]" />

      <div className="center relative z-[2]">
        <motion.div
          className="mx-auto mb-12 max-w-2xl text-center max-md:mb-8"
          variants={fadeIn}
          initial="initial"
          whileInView="animate"
          viewport={{ amount: 0.5, once: true }}
        >
          <div className="label mb-3 max-md:mb-1">The scam problem</div>
          <div className="bg-radial-white-2 bg-clip-text text-transparent text-title-1 max-lg:text-title-2 max-md:text-title-1-mobile">
            Bigger, and harder to spot than{' '}
            <span style={{ backgroundImage: 'linear-gradient(135deg, #7ae2cf 0%, #4bbfaa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ever.
            </span>
          </div>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 gap-4 max-md:grid-cols-1 lg:grid-cols-4"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ amount: 0.2, once: true }}
        >
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className="relative flex flex-col gap-2 rounded-[1.25rem] p-6 after:absolute after:inset-0 after:rounded-[1.25rem] after:border after:border-line after:pointer-events-none"
              style={{
                background: 'rgba(122,226,207,0.03)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 0 0 1px rgba(122,226,207,0.08), 0 24px 48px rgba(0,0,0,0.25)'
              }}
            >
              <div
                className="bg-radial-white-2 bg-clip-text text-transparent font-semibold"
                style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', lineHeight: 1, letterSpacing: '-0.03em' }}
              >
                {stat.value}
              </div>
              <div className="text-description-2 text-description leading-snug">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="mt-6 text-center"
          variants={fadeIn}
          initial="initial"
          whileInView="animate"
          viewport={{ amount: 0.5, once: true }}
        >
          <p className="mb-5 text-[11px] text-white/30">
            Sources: FTC and FBI IC3 2024 reporting.
          </p>
          <p className="mb-6 text-description text-white/60">
            The safest time to check is before you act.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center h-10 px-6 rounded-xl text-title-5 text-white/80 transition-all hover:text-white after:absolute after:inset-0 after:border after:border-white/12 after:rounded-xl after:pointer-events-none hover:after:border-white/25 relative"
            style={{
              background: 'rgba(255,255,255,0.04)',
              boxShadow: '0.0625rem 0.0625rem 0.0625rem 0 rgba(255,255,255,0.08) inset'
            }}
          >
            Start your first check
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
