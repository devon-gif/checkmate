'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

export default function Start() {
  return (
    <div className="relative min-h-175 overflow-hidden pt-24 pb-20 max-lg:min-h-150 max-lg:pt-20 max-md:min-h-120 max-md:py-14">
      <div
        className="absolute top-0 left-1/2 -translate-x-[51%] rotate-12 w-[120vw] opacity-45 max-2xl:w-420 max-md:w-280 max-md:opacity-35"
        style={{
          WebkitMaskImage:
            'radial-gradient(88.47% 97.89% at 53.08% 1.39%, rgba(217,217,217,0) 43.12%, #737373 100%)',
          maskImage:
            'radial-gradient(88.47% 97.89% at 53.08% 1.39%, rgba(217,217,217,0) 43.12%, #737373 100%)'
        }}
      >
        <video
          className="w-full -mt-110 max-4xl:-mt-100 max-3xl:-mt-84 max-2xl:-mt-68 max-lg:-mt-76 max-md:-mt-40"
          src="/videos/video-2.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
      </div>
      <div className="absolute inset-0 z-[2] bg-[radial-gradient(circle_at_50%_20%,rgba(5,17,23,0.32),rgba(5,17,23,0.9)_58%,#051117_100%)]" />
      <div className="absolute inset-x-0 top-0 z-[2] h-72 bg-gradient-to-b from-deep via-deep/70 to-transparent" />
      <motion.div
        className="center relative z-[3] !max-w-185 text-center"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.7 }}
        viewport={{ amount: 0.6 }}
      >
        <div
          className="relative mx-auto max-w-170 rounded-[1.25rem] bg-content/70 px-10 py-9 shadow-2 backdrop-blur-[1.25rem] after:absolute after:inset-0 after:rounded-[1.25rem] after:border after:border-line after:pointer-events-none max-md:px-6 max-md:py-7"
          style={{
            boxShadow:
              '0.0625rem 0.0625rem 0.0625rem 0 rgba(255,255,255,0.1) inset, 0 0 6.25rem 0 rgba(255,255,255,0.08) inset, 0 2rem 6rem rgba(0,0,0,0.28)'
          }}
        >
          <div className="absolute left-1/2 top-0 -z-10 size-72 -translate-x-1/2 rounded-full bg-green/10 blur-[5rem]" />
          <div className="mb-3 bg-radial-white-2 bg-clip-text text-transparent text-title-1 max-lg:text-title-2 max-md:mx-auto max-md:max-w-90 max-md:text-title-1-mobile">
            Before you click, pay, reply, or apply, ask Ray.
          </div>
          <div className="mx-auto mb-7 max-w-132 text-description max-md:mb-5">
            Paste a job post, recruiter message, suspicious text, email, link,
            or bill. Ray checks for common red flags and gives you a
            plain-English readout in seconds.
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/try"
              className="relative inline-flex justify-center items-center h-11 px-6 rounded-xl text-title-5 text-white cursor-pointer transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background:
                  'linear-gradient(135deg, #FF7A6B 0%, #FF9B5E 100%)',
                boxShadow:
                  '0 0 28px rgba(255,112,90,0.42), 0 0 56px rgba(255,112,90,0.16), inset 0 1px 0 rgba(255,255,255,0.15)'
              }}
            >
              Start free trial
            </Link>
            <Link
              href="/try"
              className="relative inline-flex justify-center items-center h-11 px-5 rounded-xl text-title-5 text-white/75 cursor-pointer transition-all after:absolute after:inset-0 after:border after:border-white/12 after:rounded-xl after:pointer-events-none hover:text-white hover:after:border-white/30"
              style={{
                background: 'rgba(255,255,255,0.04)',
                boxShadow:
                  '0.0625rem 0.0625rem 0.0625rem 0 rgba(255,255,255,0.08) inset'
              }}
            >
              Check a suspicious message
            </Link>
          </div>
          <div className="mx-auto mt-5 max-w-105 text-description-3 text-white/40">
            Ray can be wrong. Results are informational only. Verify through
            official channels.
          </div>
        </div>
      </motion.div>
      <div>
        <div className="absolute z-[1] top-84.5 -left-29.5 size-99 bg-green/20 rounded-full blur-[6.75rem] max-md:size-46 max-md:top-67 max-md:-left-32.5" />
        <div className="absolute z-[1] top-44.5 -right-41.5 size-99 bg-green/20 rounded-full blur-[6.75rem] max-md:size-46 max-md:top-48 max-md:-right-43" />
      </div>
    </div>
  )
}
