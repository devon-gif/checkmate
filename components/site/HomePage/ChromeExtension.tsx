'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { fadeUp, glassReveal } from '@/lib/animations'

const redFlags = [
  'Equipment purchase request',
  'Vague company info',
  'Text-only recruiter contact',
  'Rushed hiring language'
]

/** Compact CheckRay icon — teal gradient square with the logo image */
function CheckRayIcon({ size = 28 }: { size?: number }) {
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-lg overflow-hidden"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #7ae2cf 0%, #38b39a 100%)',
        boxShadow: '0 0 16px rgba(122,226,207,0.45)'
      }}
    >
      <Image
        src="/checkraylogo.png"
        alt="CheckRay"
        width={size * 3}
        height={size * 3}
        className="object-contain p-[18%] w-full h-full"
        style={{ filter: 'brightness(0) invert(0.08)' }}
      />
    </div>
  )
}

function BrowserMockup() {
  return (
    <div className="relative w-full">
      {/* Layered ambient glow */}
      <div className="pointer-events-none absolute inset-x-[8%] top-[10%] -z-10 h-[60%] rounded-full bg-green/12 blur-[5rem]" />
      <div className="pointer-events-none absolute inset-x-[20%] top-[25%] -z-10 h-[40%] rounded-full bg-green/8 blur-[3rem]" />

      {/* Outer frame with stronger border + glow ring */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: '#08131c',
          boxShadow:
            '0 0 0 1px rgba(122,226,207,0.12), 0 48px_120px_rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.06)'
        }}
      >
        {/* ── Browser chrome ── */}
        <div
          className="border-b border-white/[0.07]"
          style={{ background: 'rgba(5,13,20,0.98)' }}
        >
          {/* Tab row */}
          <div className="flex items-center gap-0 px-3 pt-2.5 pb-0">
            {/* Traffic lights */}
            <div className="flex gap-1.5 shrink-0 mr-3 mb-2">
              <div className="size-3 rounded-full bg-red-500/40" />
              <div className="size-3 rounded-full bg-yellow-400/35" />
              <div className="size-3 rounded-full bg-green-500/35" />
            </div>
            {/* Active tab */}
            <div
              className="flex items-center gap-2 h-8 px-3.5 rounded-t-lg border-x border-t border-white/[0.08] text-[11px] text-white/55 max-w-[220px] truncate"
              style={{ background: '#0b1922' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0 opacity-50">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="truncate">Remote Data Entry Specialist — Indeed</span>
            </div>
            {/* New-tab button */}
            <div className="ml-1.5 mb-0 size-6 flex items-center justify-center text-white/20 text-base leading-none select-none">+</div>
          </div>

          {/* Address + toolbar row */}
          <div className="flex items-center gap-2.5 px-4 py-2">
            {/* Nav arrows */}
            <div className="flex items-center gap-1 text-white/20">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="opacity-40"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            {/* Reload */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="text-white/20 shrink-0">
              <path d="M4 12a8 8 0 018-8 8 8 0 017.4 5M20 4v5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {/* Address bar */}
            <div className="flex flex-1 items-center gap-2 h-7 px-3 rounded-md border border-white/[0.07] bg-white/[0.04]">
              {/* Lock icon */}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-green/60 shrink-0">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <span className="text-[11px] text-white/32 truncate font-mono tracking-tight">
                indeed.com/job/remote-data-entry-specialist-k92847
              </span>
            </div>
            {/* Extension toolbar area */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Puzzle icon (extensions) */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white/18">
                <path d="M20.5 11H19V7a2 2 0 00-2-2h-4V3.5A2.5 2.5 0 0010.5 1 2.5 2.5 0 008 3.5V5H4a2 2 0 00-2 2v3.8h1.5a2.7 2.7 0 010 5.4H2V20a2 2 0 002 2h3.8v-1.5a2.7 2.7 0 015.4 0V22H17a2 2 0 002-2v-4h1.5a2.5 2.5 0 000-5z" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              {/* CheckRay extension icon — pinned in toolbar */}
              <div
                className="shrink-0 flex items-center justify-center rounded overflow-hidden"
                style={{
                  width: 22,
                  height: 22,
                  background: 'linear-gradient(135deg, #7ae2cf 0%, #38b39a 100%)',
                  boxShadow: '0 0 10px rgba(122,226,207,0.5)'
                }}
              >
                <Image
                  src="/checkraylogo.png"
                  alt="CheckRay"
                  width={66}
                  height={66}
                  className="object-contain p-[18%] w-full h-full"
                  style={{ filter: 'brightness(0) invert(0.08)' }}
                />
              </div>
              {/* Profile dot */}
              <div className="size-5 rounded-full bg-white/10 border border-white/12" />
            </div>
          </div>
        </div>

        {/* ── Main content area ── */}
        <div className="flex" style={{ minHeight: '300px' }}>

          {/* Left: fake job listing */}
          <div className="flex-1 px-7 py-6 overflow-hidden max-md:hidden" style={{ background: '#0b1922' }}>
            {/* Page header */}
            <div className="mb-4">
              <div className="text-[10px] text-white/22 mb-2 tracking-widest uppercase font-medium">
                Job posting · indeed.com
              </div>
              <div className="text-[16px] font-semibold text-white/90 mb-1.5 leading-snug">
                Remote Data Entry Specialist
              </div>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="text-[12px] text-white/40">GlobalTech Solutions</span>
                <span className="text-white/12">·</span>
                <span className="text-[12px] text-white/40">Remote</span>
                <span className="text-white/12">·</span>
                <span className="text-[12px] text-green/55">$85,000 – $92,000 / yr</span>
              </div>
              {/* Apply / Save buttons */}
              <div className="flex gap-2">
                <div className="h-7 px-4 rounded-md bg-blue-500/20 border border-blue-500/25 text-[11px] text-blue-300/70 flex items-center">Apply now</div>
                <div className="h-7 px-3 rounded-md bg-white/5 border border-white/8 text-[11px] text-white/35 flex items-center">Save</div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/6 mb-4" />

            {/* Skeleton copy lines */}
            <div className="space-y-2 mb-4">
              {[92, 85, 97, 78, 90].map((w, i) => (
                <div key={i} className="h-[7px] rounded-full bg-white/[0.055]" style={{ width: `${w}%` }} />
              ))}
            </div>

            {/* Highlighted suspicious text */}
            <div className="relative rounded-xl border border-yellow-400/20 bg-yellow-400/[0.04] px-4 pt-5 pb-3.5 mb-3.5"
              style={{ boxShadow: '0 0 20px rgba(250,204,21,0.05), inset 0 0 0 1px rgba(250,204,21,0.08)' }}
            >
              <div className="absolute -top-2.5 left-4 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#0b1922] border border-yellow-400/20">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" className="text-yellow-300/70">
                  <path d="M12 2L2 20h20L12 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M12 9v5M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className="text-[9px] text-yellow-300/75 uppercase tracking-wider font-semibold">
                  Flagged text
                </span>
              </div>
              <p className="text-[11px] text-white/48 leading-relaxed">
                <span className="text-yellow-300/75 font-semibold">Equipment note: </span>
                We will send you a check to purchase your home-office setup. Please deposit and wire the difference back to our equipment vendor within 24 hours of receipt.
              </p>
            </div>

            {/* "Check with Ray" context-menu trigger */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green/10 border border-green/20 cursor-pointer"
              style={{ boxShadow: '0 0 12px rgba(122,226,207,0.08)' }}
            >
              <div className="size-1.5 rounded-full bg-green animate-pulse" />
              <span className="text-[11px] text-green/80 font-medium">Check this with Ray →</span>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px bg-white/[0.06] max-md:hidden" />

          {/* Right: CheckRay extension panel */}
          <div
            className="w-[17rem] flex flex-col shrink-0 max-md:w-full"
            style={{
              background: 'rgba(4,14,20,0.99)',
              boxShadow: 'inset 1px 0 0 rgba(122,226,207,0.06)'
            }}
          >
            {/* Panel header — real logo */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]"
              style={{ background: 'rgba(5,17,23,0.98)' }}
            >
              <div className="flex items-center gap-2">
                <CheckRayIcon size={26} />
                <span className="text-[13px] font-semibold text-white tracking-tight">CheckRay</span>
              </div>
              {/* High-risk indicator */}
              <div className="flex items-center gap-1.5">
                <div
                  className="size-2 rounded-full"
                  style={{ background: '#f87171', boxShadow: '0 0 8px rgba(239,68,68,0.7)' }}
                />
                <span className="text-[10px] text-red-400/80 font-medium uppercase tracking-wider">Live</span>
              </div>
            </div>

            {/* Risk assessment */}
            <div className="px-4 py-4 border-b border-white/[0.07]">
              <div className="text-[9px] text-white/30 uppercase tracking-widest mb-1.5 font-medium">
                Risk assessment
              </div>
              <div className="text-[14px] font-semibold text-white mb-3 leading-snug">
                Possible ghost job
              </div>

              {/* Score bar */}
              <div className="flex items-center gap-2.5 mb-2">
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: '91%',
                      background: 'linear-gradient(90deg, #dc2626, #f87171)',
                      boxShadow: '0 0 8px rgba(239,68,68,0.5)'
                    }}
                  />
                </div>
                <span className="text-[11px] font-bold text-red-400 shrink-0 tabular-nums">91/100</span>
              </div>

              {/* Risk badge */}
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  borderColor: 'rgba(239,68,68,0.22)'
                }}
              >
                <div
                  className="size-1.5 rounded-full"
                  style={{ background: '#f87171', boxShadow: '0 0 5px rgba(239,68,68,0.6)' }}
                />
                <span className="text-[10px] text-red-400 font-semibold uppercase tracking-wider">
                  High risk
                </span>
              </div>
            </div>

            {/* Red flags */}
            <div className="px-4 py-4 flex-1">
              <div className="text-[9px] text-white/30 uppercase tracking-widest mb-3 font-medium">
                Red flags Ray noticed
              </div>
              <div className="space-y-2">
                {redFlags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div
                      className="size-1.5 rounded-full shrink-0 mt-[4px]"
                      style={{ background: '#f87171', boxShadow: '0 0 5px rgba(239,68,68,0.4)' }}
                    />
                    <span className="text-[11px] text-white/50 leading-snug">{flag}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="px-4 py-4 border-t border-white/[0.07]">
              <button
                className="w-full h-8 rounded-lg text-[11px] font-bold text-[#051117] tracking-wide transition-all hover:opacity-90 hover:shadow-[0_0_20px_rgba(122,226,207,0.4)]"
                style={{
                  background: 'linear-gradient(135deg, #7ae2cf 0%, #4bbfaa 100%)',
                  boxShadow: '0 0 16px rgba(122,226,207,0.3)'
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
              <span className="size-1.5 rounded-full bg-green shrink-0 animate-pulse" />
              Included in paid plans · Coming soon
            </div>

            <div className="mb-5 bg-radial-white-2 bg-clip-text text-transparent text-title-1 max-lg:text-title-2 max-md:text-title-1-mobile max-md:mb-3">
              Check suspicious pages right in Chrome.
            </div>
            <div className="mb-8 text-description max-w-xl mx-auto max-md:mb-6">
              Job posts, recruiter pages, links, and emails — Ray can flag risk signals without
              making you leave the tab.
            </div>

            {/* Feature chips */}
            <div className="flex flex-wrap justify-center gap-2 mb-9 max-md:mb-6">
              {[
                'Check job listings while browsing',
                'Flag suspicious recruiter messages',
                'Score sketchy links before clicking',
                'Open a full report in one click'
              ].map(bullet => (
                <div
                  key={bullet}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[12px] text-white/55 transition-colors"
                  style={{
                    background: 'rgba(122,226,207,0.04)',
                    borderColor: 'rgba(122,226,207,0.12)'
                  }}
                >
                  <div className="size-1.5 rounded-full bg-green/60 shrink-0" />
                  {bullet}
                </div>
              ))}
            </div>

            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center gap-2 h-11 px-8 rounded-xl font-semibold text-[14px] text-[#051117] tracking-tight transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #7ae2cf 0%, #4bbfaa 100%)',
                boxShadow: '0 0 32px rgba(122,226,207,0.45)'
              }}
            >
              Get early access
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
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
        <div className="absolute top-20 left-[calc(50%-52rem)] size-[28rem] bg-green/10 rounded-full blur-[8rem]" />
        <div className="absolute bottom-10 right-[calc(50%-52rem)] size-[28rem] bg-green/10 rounded-full blur-[8rem]" />
      </div>
    </div>
  )
}
