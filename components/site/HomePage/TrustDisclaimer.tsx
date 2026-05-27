'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { fadeUp, fadeIn } from '@/lib/animations'

const bullets = [
  'Do not send money based only on a message.',
  'Do not trust links from suspicious threads.',
  'Contact banks, employers, agencies, or companies through official channels you find yourself.'
]

export default function TrustDisclaimer() {
  return (
    <div className="relative py-20 max-lg:py-16 max-md:py-12">
      <div className="pointer-events-none absolute inset-x-[25%] top-0 -z-10 h-full rounded-full bg-green/6 blur-[6rem]" />

      <div className="center relative z-[2]">
        <motion.div
          className="mx-auto max-w-2xl rounded-[1.25rem] p-10 text-center after:absolute after:inset-0 after:rounded-[1.25rem] after:border after:border-line after:pointer-events-none relative max-md:p-7"
          variants={fadeIn}
          initial="initial"
          whileInView="animate"
          viewport={{ amount: 0.4, once: true }}
          style={{
            background: 'rgba(122,226,207,0.025)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 0 0 1px rgba(122,226,207,0.08), 0 24px 48px rgba(0,0,0,0.3)'
          }}
        >
          {/* Teal glow orb */}
          <div className="pointer-events-none absolute left-1/2 top-0 -z-10 size-56 -translate-x-1/2 rounded-full bg-green/10 blur-[4rem]" />

          <div className="label mb-3">About CheckRay</div>
          <h2
            className="mb-4 bg-radial-white-2 bg-clip-text text-transparent max-md:mb-3"
            style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', lineHeight: 1.15, letterSpacing: '-0.025em', fontWeight: 500 }}
          >
            Ray is a second opinion, not a guarantee.
          </h2>
          <p className="mx-auto mb-6 max-w-lg text-description leading-relaxed max-md:mb-5">
            CheckRay is informational only. Ray can be wrong. For payments, banking, identity documents, legal notices, medical claims, taxes, or job deposits, verify through official sources.
          </p>

          <motion.ul
            className="mx-auto mb-8 max-w-md space-y-3 text-left max-md:mb-6"
            variants={{ animate: { transition: { staggerChildren: 0.08 } } }}
            initial="initial"
            whileInView="animate"
            viewport={{ amount: 0.3, once: true }}
          >
            {bullets.map((b, i) => (
              <motion.li
                key={i}
                variants={fadeUp}
                className="flex items-start gap-3 text-[13px] text-white/50 leading-snug"
              >
                <div className="mt-[4px] size-1.5 shrink-0 rounded-full bg-green/60" />
                {b}
              </motion.li>
            ))}
          </motion.ul>

          <Link
            href="/try"
            className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-xl text-title-5 text-white/75 transition-all hover:text-white relative after:absolute after:inset-0 after:border after:border-white/12 after:rounded-xl after:pointer-events-none hover:after:border-white/28"
            style={{
              background: 'rgba(255,255,255,0.04)',
              boxShadow: '0.0625rem 0.0625rem 0.0625rem 0 rgba(255,255,255,0.08) inset'
            }}
          >
            Check a suspicious message
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
