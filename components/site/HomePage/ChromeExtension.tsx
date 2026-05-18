'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { fadeUp, glassReveal } from '@/lib/animations'

const redFlags = [
  'Equipment purchase request',
  'Vague company info',
  'Text-only recruiter contact',
  'Rushed hiring language'
]

function BrowserMockup() {
  return (
    <div className="relative w-full">
      {/* Ambient glow behind mockup */}
      <div className="absolute inset-x-[5%] top-[15%] -z-10 h-[55%] rounded-full bg-green/10 blur-[5rem] pointer-events-none" />

      <div
        className="relative rounded-xl overflow-hidden border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.7)]"
        style={{ background: '#0b1922' }}
      >
        {/* Browser chrome / tab bar */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b border-white/8"
          style={{ background: 'rgba(8,18,28,0.95)' }}
        >
          {/* Traffic lights */}
          <div className="flex gap-1.5 shrink-0">
            <div className="size-3 rounded-full bg-white/12" />
            <div className="size-3 rounded-full bg-white/12" />
            <div className="size-3 rounded-full bg-white/12" />
          </div>
          {/* Address bar */}
          <div className="flex-1 flex items-center gap-2 h-7 px-3 rounded-md bg-white/5 border border-white/8">
            <div className="size-2 rounded-full bg-green/50 shrink-0" />
            <span className="text-[11px] text-white/35 truncate font-mono">
              indeed.com/job/remote-data-entry-specialist-k92847
            </span>
          </div>
          {/* CheckRay extension icon */}
          <div
            className="shrink-0 flex items-center justify-center size-7 rounded-md text-[10px] font-bold text-deep"
            style={{
              background: 'linear-gradient(135deg, #7ae2cf 0%, #4bbfaa 100%)',
              boxShadow: '0 0 14px rgba(122,226,207,0.35)'
            }}
          >
            R
          </div>
        </div>

        {/* Main content area */}
        <div className="flex" style={{ minHeight: '280px' }}>
          {/* Fake job listing page */}
          <div className="flex-1 px-7 py-6 overflow-hidden max-md:hidden">
            {/* Page header */}
            <div className="mb-4">
              <div className="text-[11px] text-white/25 mb-1.5 tracking-wider uppercase">
                Job posting · indeed.com
              </div>
              <div className="text-[15px] font-medium text-white/85 mb-1 leading-snug">
                Remote Data Entry Specialist
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[12px] text-white/40">GlobalTech Solutions</span>
                <span className="text-white/15">·</span>
                <span className="text-[12px] text-white/40">Remote</span>
                <span className="text-white/15">·</span>
                <span className="text-[12px] text-white/40">$85,000–$92,000/yr</span>
              </div>
            </div>

            {/* Fake body skeleton lines */}
            <div className="space-y-2 mb-4">
              {[100, 90, 95, 82, 88].map((w, i) => (
                <div key={i} className="h-2 rounded bg-white/7" style={{ width: `${w}%` }} />
              ))}
            </div>

            {/* Suspicious paragraph — highlighted */}
            <div className="relative rounded-lg border border-yellow-400/20 bg-yellow-400/5 px-4 py-3 mb-3">
              <div className="absolute -top-2.5 left-3 px-1.5 py-0.5 rounded bg-yellow-400/15 border border-yellow-400/20">
                <span className="text-[9px] text-yellow-300/80 uppercase tracking-wider font-medium">
                  Selected text
                </span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed mt-1">
                <span className="text-yellow-300/70 font-medium">Equipment note: </span>
                We will send you a check to purchase your home-office setup. Please deposit and wire the difference back to our equipment vendor within 24 hours.
              </p>
            </div>

            {/* "Check with Ray" trigger */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green/10 border border-green/20 cursor-pointer">
              <div className="size-1.5 rounded-full bg-green animate-pulse" />
              <span className="text-[11px] text-green/80 font-medium">Check with Ray →</span>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px bg-white/8 max-md:hidden" />

          {/* Ray extension panel */}
          <div
            className="w-72 flex flex-col shrink-0 max-md:w-full"
            style={{ background: 'rgba(5,17,23,0.98)' }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8">
              <div className="flex items-center gap-2">
                <div
                  className="size-6 rounded-full flex items-center justify-center text-[10px] font-bold text-deep shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #7ae2cf 0%, #4bbfaa 100%)',
                    boxShadow: '0 0 10px rgba(122,226,207,0.3)'
                  }}
                >
                  R
                </div>
                <span className="text-[12px] font-medium text-white">CheckRay</span>
              </div>
              {/* High-risk dot */}
              <div
                className="size-3.5 rounded-full shrink-0"
                style={{
                  background: 'radial-gradient(circle, #f87171 0%, #ef4444 100%)',
                  boxShadow: '0 0 10px rgba(239,68,68,0.6)'
                }}
              />
            </div>

            {/* Risk result */}
            <div className="px-5 py-4 border-b border-white/8">
              <div className="text-[10px] text-white/35 uppercase tracking-wider mb-2">
                Risk assessment
              </div>
              <div className="text-[15px] font-semibold text-white mb-3 leading-snug">
                Possible ghost job
              </div>
              {/* Score bar */}
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: '91%',
                      background: 'linear-gradient(90deg, #ef4444, #f87171)',
                      boxShadow: '0 0 10px rgba(239,68,68,0.5)'
                    }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-red-400 shrink-0 tabular-nums">
                  91 / 100
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className="size-1.5 rounded-full"
                  style={{ background: '#f87171', boxShadow: '0 0 6px rgba(239,68,68,0.6)' }}
                />
                <span className="text-[10px] text-red-400 font-medium uppercase tracking-wider">
                  High risk
                </span>
              </div>
            </div>

            {/* Red flags */}
            <div className="px-5 py-4 flex-1">
              <div className="text-[10px] text-white/35 uppercase tracking-wider mb-3">
                Red flags Ray noticed
              </div>
              <div className="space-y-2.5">
                {redFlags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] text-white/55 leading-snug">
                    <div
                      className="size-1.5 rounded-full shrink-0 mt-[3px]"
                      style={{ background: '#f87171', boxShadow: '0 0 6px rgba(239,68,68,0.35)' }}
                    />
                    {flag}
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="px-5 py-4 border-t border-white/8">
              <button
                className="w-full h-8 rounded-lg text-[11px] font-semibold text-deep transition-opacity hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, #7ae2cf 0%, #4bbfaa 100%)',
                  boxShadow: '0 0 16px rgba(122,226,207,0.25)'
                }}
              >
                Open full report →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ChromeExtension() {
  return (
    <div
      id="extension"
      className="relative pt-34.5 pb-30 max-xl:pt-20 max-xl:pb-24 max-lg:py-20 max-md:py-15"
    >
      <div className="center relative z-[2]">
        <div className="flex flex-col items-center gap-16 max-lg:gap-12">
          {/* Copy block */}
          <motion.div
            className="max-w-2xl text-center"
            variants={fadeUp}
            initial="initial"
            whileInView="animate"
            viewport={{ amount: 0.5, once: true }}
          >
            <div className="label mb-3 max-md:mb-1">Chrome extension</div>

            {/* Status pill */}
            <div className="inline-flex items-center gap-2 mb-5 px-3.5 py-1.5 rounded-full border border-green/20 bg-green/8 text-[11px] text-green/75 max-md:mb-4">
              <span className="size-1.5 rounded-full bg-green shrink-0" />
              Included in paid plans · Coming soon
            </div>

            <div className="mb-5 bg-radial-white-2 bg-clip-text text-transparent text-title-1 max-lg:text-title-2 max-md:text-title-1-mobile max-md:mb-3">
              Check suspicious pages right in Chrome.
            </div>
            <div className="mb-8 text-description max-w-xl mx-auto max-md:mb-6">
              Job posts, recruiter pages, links, and emails — Ray can flag risk signals without
              making you leave the tab.
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-2.5 mb-9 max-md:gap-2 max-md:mb-6">
              {[
                'Check job listings while browsing',
                'Flag suspicious recruiter messages',
                'Score sketchy links before clicking',
                'Open a full report in one click'
              ].map(bullet => (
                <div
                  key={bullet}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/8 text-[12px] text-white/55"
                >
                  <div className="size-1.5 rounded-full bg-green/60 shrink-0" />
                  {bullet}
                </div>
              ))}
            </div>

            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center h-11 px-7 rounded-xl text-title-5 text-deep transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #7ae2cf 0%, #4bbfaa 100%)',
                boxShadow: '0 0 28px rgba(122,226,207,0.40)'
              }}
            >
              Get early access
            </Link>
          </motion.div>

          {/* Browser mockup */}
          <motion.div
            className="w-full max-w-4xl"
            variants={glassReveal}
            initial="initial"
            whileInView="animate"
            viewport={{ amount: 0.2, once: true }}
          >
            <BrowserMockup />
          </motion.div>
        </div>
      </div>

      {/* Ambient glows */}
      <div className="pointer-events-none max-md:hidden">
        <div className="absolute top-20 left-[calc(50%-50rem)] size-96 bg-green/12 rounded-full blur-[8rem]" />
        <div className="absolute bottom-10 right-[calc(50%-50rem)] size-96 bg-green/12 rounded-full blur-[8rem]" />
      </div>
    </div>
  )
}
