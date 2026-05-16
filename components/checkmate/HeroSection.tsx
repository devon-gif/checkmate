'use client'

import { motion } from 'framer-motion'
import { GradientButton } from './GradientButton'
import { RiskDemo } from './RiskDemo'

export function HeroSection() {
  return (
    <div className="relative pb-20 pt-58 max-xl:pt-48 max-lg:pt-44 max-md:pb-15 max-md:pt-21">
      {/* ── Animated content column ─────────────────────────────────────── */}
      <motion.div
        className="center relative z-[3]"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-[46.75rem]">
          {/* Badge */}
          <div className="mb-4 inline-flex items-center gap-2 text-title-3 text-green max-md:mb-2 max-md:text-[14px]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green" />
            Free risk checks — no account required
          </div>

          {/* Headline — large bottom-margin on mobile creates space for the video orb */}
          <div className="mb-41 bg-radial-white-1 bg-clip-text text-big-title-1 text-transparent max-xl:text-big-title-2 max-lg:mb-10 max-lg:text-title-1 max-md:mb-[34rem] max-md:text-big-title-mobile">
            Not sure if it&rsquo;s real?
            <br />
            Ask Ray.
          </div>

          {/* Floating right-column copy — absolute on desktop, inline on tablet/mobile */}
          <div className="absolute bottom-72 right-20 flex max-w-44 flex-col gap-44 text-right text-title-5 text-green max-xl:right-10 max-xl:gap-30 max-lg:static max-lg:mb-8 max-lg:gap-6 max-lg:text-left max-md:mb-13 max-md:gap-10 max-md:text-title-3-mobile">
            <div>Spot scams, ghost jobs, and shady bills in seconds</div>
            <div>Risk score, red flags, and what to do next</div>
          </div>

          {/* Description */}
          <div className="mb-9.5 max-w-110 text-description max-lg:max-w-88 max-md:mb-6 max-md:max-w-full">
            Text, forward, paste, or upload suspicious messages, job posts,
            links, bills, and emails. CheckMate gives you a risk score, possible
            red flags, and what to do next.
          </div>

          {/* CTAs */}
          <div className="mb-6 flex flex-wrap items-center gap-3 max-md:mb-4">
            <GradientButton href="/try" variant="primary">
              Try a free check
            </GradientButton>
            <GradientButton href="#how-it-works" variant="secondary">
              See how Ray works
            </GradientButton>
          </div>

          {/* Supporting line */}
          <div className="max-w-110 text-description-3 text-description max-md:mb-8">
            Works by text, email, or web. Save it to your home screen when
            you&rsquo;re ready.
          </div>

          {/* Risk demo card — absolute right column on desktop, inline below on mobile */}
          <RiskDemo />
        </div>
      </motion.div>

      {/* ── Video orb ───────────────────────────────────────────────────── */}
      {/*  Absolute circular video, right of centre on desktop.             */}
      {/*  Drops to top-left on mobile — headline mb-[34rem] creates room.  */}
      <div className="absolute top-23 right-[calc(50%-28.5rem)] h-178 w-178 rounded-full max-xl:h-140 max-xl:w-140 max-lg:right-[-6rem] max-md:left-8.5 max-md:right-auto max-md:top-36 max-md:h-133 max-md:w-133">
        {/* mask-radial = radial-gradient(50% 50% at 50% 50%, #000 20%, transparent 52%) */}
        <div className="mask-radial absolute -inset-[10%]">
          <video
            className="w-full"
            src="/videos/video-1.mp4"
            autoPlay
            loop
            muted
            playsInline
          />
        </div>
        {/* Subtle inner glass ring */}
        <div className="absolute inset-0 rounded-full bg-black/[0.01] shadow-[0.875rem_1.0625rem_1.25rem_0_rgba(255,255,255,0.25)_inset]" />
      </div>

      {/* ── Background glow orbs ─────────────────────────────────────────── */}
      <div>
        <div className="absolute top-61.5 right-[calc(50%-35.18rem)] z-[2] h-116.5 w-116.5 rounded-full bg-green/20 blur-[8rem] max-lg:right-[-24rem] max-md:left-74 max-md:right-auto max-md:top-36" />
        <div className="absolute top-77 left-[calc(50%-57.5rem)] z-[2] h-116.5 w-116.5 rounded-full bg-green/20 blur-[8rem] max-lg:left-[-15rem] max-md:top-84 max-md:h-80 max-md:w-80 max-md:left-[-13rem]" />
      </div>
    </div>
  )
}

