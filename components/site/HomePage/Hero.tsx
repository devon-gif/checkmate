'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'

function PhoneVideoDemo() {
  // Production video is loaded from Supabase Storage via NEXT_PUBLIC_CHECKRAY_PHONE_VIDEO_URL.
  // Falls back to the local /public/videos file during development.
  const phoneVideoSrc =
    process.env.NEXT_PUBLIC_CHECKRAY_PHONE_VIDEO_URL || '/videos/checkray-phone.mp4'

  return (
    // Pulled left from the edge — was right-0, now right-[-2rem] on xl gives breathing room
    <div className="absolute right-[-2rem] bottom-0 max-xl:right-[-1rem] max-lg:static max-lg:mt-10 max-lg:mx-auto">
      {/* Ambient mint glow sitting behind the device */}
      <div className="absolute inset-x-[-15%] top-[20%] -z-10 h-[70%] rounded-full bg-green/20 blur-[6rem]" />

      <div className="relative w-[400px] max-xl:w-[350px] max-lg:w-[300px] max-md:w-[260px]">
        {/* Screen clip layer — sits below the phone frame PNG (z-10 < z-20) */}
        <div
          className="absolute overflow-hidden rounded-[2.5rem] max-xl:rounded-[2.2rem] max-lg:rounded-[1.8rem] max-md:rounded-[1.5rem]"
          style={{ top: '3%', left: '6%', right: '6%', bottom: '3%', zIndex: 10 }}
        >
          <video
            src={phoneVideoSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
            onError={() => console.error("CheckRay hero video failed to load", phoneVideoSrc)}
          />
        </div>

        {/* Phone frame PNG — stays on top with pointer-events-none */}
        <Image
          src="/images/oihoihoihoih.png"
          alt=""
          width={840}
          height={1700}
          priority
          className="relative z-20 w-full h-auto pointer-events-none select-none drop-shadow-[0_48px_96px_rgba(0,0,0,0.55)]"
        />
      </div>
    </div>
  )
}

export default function Hero() {
  return (
    <div className="relative pt-18 pb-14 max-xl:pt-14 max-lg:pt-12 max-md:pt-8 max-md:pb-10">
      <motion.div
        className="center relative z-[3]"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-[38rem]">
          <div className="mb-3 inline-flex items-center gap-1.5 text-[13px] leading-none tracking-wide text-green max-md:text-[11px] max-md:mb-2">
            <span className="size-1.5 rounded-full bg-green animate-pulse" />
            Free scam and risk checks. No account required.
          </div>
          <div className="mb-8 text-big-title-1 bg-radial-white-1 bg-clip-text text-transparent max-xl:text-big-title-2 max-lg:text-title-1 max-lg:mb-5 max-md:mb-[20rem] max-md:text-big-title-mobile">
            Not sure if it&apos;s real?
            <br />
            Check with Ray first.
          </div>
          <div className="absolute right-20 bottom-72 max-w-44 flex flex-col gap-44 text-right text-title-5 text-green max-xl:right-10 max-xl:gap-30 max-lg:static max-lg:gap-6 max-lg:mb-8 max-lg:text-left max-md:gap-10 max-md:mb-13 max-md:text-title-3-mobile">
            <div>Scam texts, ghost jobs, phishing links, and fake bills. All covered.</div>
            <div>Risk score, red flags, and what to do next</div>
          </div>
          <div className="max-w-[28rem] mb-7 text-description max-lg:max-w-88 max-md:max-w-full max-md:mb-5">
            Paste a text, email, link, bill, job post, or screenshot. CheckRay spots common red flags, explains the risk, and helps you decide what to do next.
          </div>
          <div className="flex flex-wrap items-center gap-3 mb-5 max-md:mb-4">
            <Link
              href="/try"
              className="relative inline-flex justify-center items-center h-10 px-4 rounded-lg text-title-5 text-white cursor-pointer transition-all hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, #FF7A6B, #FF9B5E)',
                boxShadow: '0 0 24px rgba(255,122,107,0.35)'
              }}
            >
              Try a free check
            </Link>
            <Link
              href="#how-it-works"
              className="relative inline-flex justify-center items-center h-10 px-4 rounded-lg text-title-5 text-white cursor-pointer transition-all after:absolute after:inset-0 after:border after:border-line after:rounded-lg after:pointer-events-none hover:after:border-white/40"
              style={{
                boxShadow:
                  '0.0625rem 0.0625rem 0.0625rem 0 rgba(255,255,255,0.10) inset'
              }}
            >
              See how Ray works
            </Link>
          </div>
          <div className="max-w-[28rem] text-description-3 text-description max-md:mb-8">
            Works for scams, phishing, fake recruiters, suspicious links, bills, and more. Ray can be wrong. Results are informational only.
          </div>
          <PhoneVideoDemo />
        </div>
      </motion.div>
      {/* Right-side video orb (premium ambient visual) */}
      <div className="absolute top-16 right-[calc(50%-44rem)] size-178 rounded-full max-xl:size-140 max-xl:right-[calc(50%-34rem)] max-md:top-36 max-md:right-auto max-md:left-8.5 max-md:size-133">
        <div className="absolute -inset-[10%] mask-radial">
          <video
            className="w-full"
            src="/videos/video-1.mp4"
            autoPlay
            loop
            muted
            playsInline
          />
        </div>
        <div className="absolute inset-0 rounded-full bg-deep/[0.01]" style={{ boxShadow: '0.875rem 1.0625rem 1.25rem 0 rgba(255,255,255,0.25) inset' }} />
      </div>
      {/* Ambient green blooms */}
      <div>
        <div className="absolute top-61.5 right-[calc(50%-35.18rem)] z-[2] size-116.5 bg-green/20 rounded-full blur-[8rem] max-md:top-36 max-lg:-right-96 max-md:left-74 max-md:right-auto" />
        <div className="absolute top-77 left-[calc(50%-57.5rem)] z-[2] size-116.5 bg-green/20 rounded-full blur-[8rem] max-lg:-left-60 max-md:top-84 max-md:-left-52 max-md:size-80" />
      </div>
    </div>
  )
}
