'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { fadeUp, fadeIn, staggerContainer } from '@/lib/animations'

const redFlags = [
  { icon: '💬', label: 'Recruiter only texts' },
  { icon: '📩', label: 'Asked to reply "YES" or "INTERESTED"' },
  { icon: '💸', label: 'Equipment deposit or fake check' },
  { icon: '🔍', label: 'Vague company details' },
  { icon: '⚡', label: 'Pressure to act today' },
]

export default function GhostJobSection() {
  return (
    <div
      id="ghost-jobs"
      className="relative py-28 max-xl:py-24 max-lg:py-20 max-md:py-16"
    >
      {/* Background radial glows */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute top-1/4 left-[-10%] size-[45rem] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #7ae2cf 0%, transparent 70%)', filter: 'blur(60px)' }}
        />
        <div
          className="absolute bottom-0 right-[-5%] size-[35rem] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #7ae2cf 0%, transparent 70%)', filter: 'blur(80px)' }}
        />
        {/* Faint dotted grid */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.025]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="ghost-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="#7ae2cf" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ghost-grid)" />
        </svg>
      </div>

      <div className="center relative z-[2]">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center max-lg:gap-12">

          {/* ── Left: copy ── */}
          <motion.div
            variants={fadeIn}
            initial="initial"
            whileInView="animate"
            viewport={{ amount: 0.35, once: true }}
            className="flex flex-col"
          >
            {/* Eyebrow pill */}
            <div
              className="mb-5 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5"
              style={{
                background: 'rgba(122,226,207,0.08)',
                border: '1px solid rgba(122,226,207,0.18)',
              }}
            >
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: '#7ae2cf', boxShadow: '0 0 6px rgba(122,226,207,0.7)' }}
              />
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#7ae2cf' }}>
                Ghost jobs &amp; fake recruiters
              </span>
            </div>

            <h2
              className="mb-6 bg-radial-white-2 bg-clip-text text-transparent max-md:mb-5"
              style={{
                fontSize: 'clamp(1.9rem, 3.8vw, 3rem)',
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
                fontWeight: 500,
              }}
            >
              Fake jobs are getting<br className="max-md:hidden" /> harder to ignore.
            </h2>

            <p className="mb-5 text-description leading-relaxed max-w-[30rem]">
              A recruiter texts you. The role sounds remote and flexible. They want a fast reply, a deposit, or a move to WhatsApp. Maybe it&apos;s real. Maybe it&apos;s not. Ray checks for fake-recruiter patterns, ghost-job signals, equipment-payment scams, and risky hiring language before you waste time or send money.
            </p>

            <p className="mb-9 text-[13px] italic max-md:mb-7" style={{ color: 'rgba(122,226,207,0.55)' }}>
              Don&apos;t ignore a real opportunity. Don&apos;t walk into a fake one.
            </p>

            {/* CTA */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/try"
                className="group inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl text-[14px] font-semibold text-[#050d15] cursor-pointer transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #7ae2cf 0%, #4bbfaa 100%)',
                  boxShadow: '0 0 0 1px rgba(122,226,207,0.3), 0 0 28px rgba(122,226,207,0.25), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                Check a job offer
                <svg
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                  fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M1 7h12M8 2l5 5-5 5" />
                </svg>
              </Link>
              <span className="text-[12px] text-white/35">No card needed to start.</span>
            </div>
          </motion.div>

          {/* ── Right: Ray job offer scan card ── */}
          <motion.div
            variants={fadeUp}
            initial="initial"
            whileInView="animate"
            viewport={{ amount: 0.25, once: true }}
            className="relative"
          >
            {/* Glow behind card */}
            <div
              className="pointer-events-none absolute -inset-8 -z-10 rounded-[2rem] opacity-40"
              style={{
                background: 'radial-gradient(ellipse at 60% 40%, rgba(122,226,207,0.18) 0%, transparent 70%)',
                filter: 'blur(20px)',
              }}
            />

            {/* Main glass card */}
            <div
              className="relative rounded-[1.5rem] overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, rgba(122,226,207,0.06) 0%, rgba(5,13,21,0.85) 60%)',
                backdropFilter: 'blur(28px)',
                border: '1px solid rgba(122,226,207,0.14)',
                boxShadow: '0 0 0 1px rgba(122,226,207,0.07), 0 32px 72px rgba(0,0,0,0.45), 0 0 60px rgba(122,226,207,0.06)',
              }}
            >
              {/* Card top bar */}
              <div
                className="flex items-center justify-between px-5 py-3.5"
                style={{ borderBottom: '1px solid rgba(122,226,207,0.09)', background: 'rgba(122,226,207,0.04)' }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="size-1.5 rounded-full animate-pulse"
                    style={{ background: '#7ae2cf', boxShadow: '0 0 6px rgba(122,226,207,0.8)' }}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(122,226,207,0.7)' }}>
                    Ray&apos;s Job Offer Scan
                  </span>
                </div>
                {/* High risk badge */}
                <div
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
                  role="img"
                  aria-label="High Risk"
                >
                  <svg className="size-3 shrink-0" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M6 1L11 10H1L6 1Z" stroke="#f87171" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M6 5v2.5" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="6" cy="8.5" r="0.6" fill="#f87171" />
                  </svg>
                  <span className="text-[10px] font-semibold" style={{ color: '#f87171' }}>High Risk</span>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Result title */}
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-widest text-white/30 mb-1">Analysis result</div>
                  <div className="text-[16px] font-semibold text-white leading-snug">Possible fake recruiter message</div>
                </div>

                {/* Suspicious message mini card */}
                <div
                  className="rounded-xl px-4 py-3"
                  style={{
                    background: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.15)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="size-3 shrink-0 text-red-400" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M6 1L11 10H1L6 1Z" stroke="#f87171" strokeWidth="1.5" strokeLinejoin="round" />
                    </svg>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-red-400/80">Suspicious message</span>
                  </div>
                  <p className="text-[13px] text-white/60 leading-relaxed italic">
                    &ldquo;Remote assistant role approved. Reply YES today for equipment setup.&rdquo;
                  </p>
                </div>

                {/* Red flags */}
                <div>
                  <div
                    className="text-[10px] font-semibold uppercase tracking-widest mb-3"
                    style={{ color: 'rgba(122,226,207,0.55)' }}
                  >
                    Red flags Ray noticed
                  </div>
                  <motion.ul
                    className="space-y-2"
                    variants={staggerContainer}
                    initial="initial"
                    whileInView="animate"
                    viewport={{ amount: 0.2, once: true }}
                  >
                    {redFlags.map((flag, i) => (
                      <motion.li
                        key={i}
                        variants={fadeUp}
                        className="flex items-center gap-3"
                      >
                        <div
                          className="size-1.5 shrink-0 rounded-full"
                          style={{ background: '#f87171', boxShadow: '0 0 5px rgba(239,68,68,0.5)' }}
                          aria-hidden="true"
                        />
                        <span className="text-[12px] text-white/70 leading-snug">{flag.label}</span>
                      </motion.li>
                    ))}
                  </motion.ul>
                </div>

                {/* Next step box */}
                <div
                  className="rounded-xl px-4 py-3"
                  style={{
                    background: 'rgba(122,226,207,0.05)',
                    border: '1px solid rgba(122,226,207,0.12)',
                  }}
                >
                  <div
                    className="text-[10px] font-semibold uppercase tracking-widest mb-1.5"
                    style={{ color: 'rgba(122,226,207,0.6)' }}
                  >
                    What Ray recommends
                  </div>
                  <p className="text-[12px] text-white/60 leading-relaxed">
                    Verify the recruiter, company domain, and job post through official channels before replying.
                  </p>
                </div>

                {/* Footer trust line */}
                <p
                  className="text-[10px] text-white/25 pt-1"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                >
                  Ray can be wrong. Verify important decisions through official sources.
                </p>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  )
}
