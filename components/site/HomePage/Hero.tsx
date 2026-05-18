'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'

function PhoneVideoDemo() {
  const phoneVideoSrc =
    process.env.NEXT_PUBLIC_CHECKRAY_PHONE_VIDEO_URL ||
    '/videos/checkray-mobile-video.mp4'

  console.log('CheckRay phone video src:', phoneVideoSrc)

  return (
    // Moved left from prior right-[-2rem] — now sits tighter against the orb
    <div className="absolute right-[7.25rem] bottom-[-4.5rem] max-xl:right-[3.75rem] max-xl:bottom-[-4rem] max-lg:static max-lg:mt-10 max-lg:mx-auto">
      {/* Ambient mint glow sitting behind the device */}
      <div className="absolute inset-x-[-15%] top-[20%] -z-10 h-[70%] rounded-full bg-green/20 blur-[6rem]" />

      <div className="relative w-[380px] max-xl:w-[330px] max-lg:w-[290px] max-md:w-[250px]">
        {/* Screen clip layer */}
        <div
          className="absolute z-30 overflow-hidden rounded-[2.5rem] bg-deep max-xl:rounded-[2.2rem] max-lg:rounded-[1.8rem] max-md:rounded-[1.5rem]"
          style={{ top: '3%', left: '6%', right: '6%', bottom: '3%' }}
        >
          <video
            src={phoneVideoSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="relative z-10 block h-full w-full scale-[0.9] object-contain opacity-100"
            onError={event =>
              console.error(
                'CheckRay hero phone video failed to load:',
                phoneVideoSrc,
                event,
              )
            }
          />
        </div>

        {/* Phone frame PNG */}
        <Image
          src="/images/oihoihoihoih.png"
          alt=""
          width={840}
          height={1700}
          priority
          className="relative z-40 w-full h-auto pointer-events-none select-none drop-shadow-[0_48px_96px_rgba(0,0,0,0.55)]"
        />
      </div>
    </div>
  )
}

export default function Hero() {
  return (
    <div className="relative pt-16 pb-12 max-xl:pt-12 max-lg:pt-10 max-md:pt-8 max-md:pb-8">
      <motion.div
        className="center relative z-[3]"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-[36rem]">
          {/* Eyebrow */}
          <div className="mb-3 inline-flex items-center text-[12px] leading-none tracking-wide text-green/80 max-md:text-[11px] max-md:mb-2">
            • Free scam and risk checks. No account required.
          </div>

          {/* Headline */}
          <div
            className="mb-5 bg-radial-white-1 bg-clip-text text-transparent max-lg:mb-4 max-md:mb-[18rem]"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 5.5rem)', lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: 400 }}
          >
            Scam?
            <br />
            Ghost job?
            <br />
            Sketchy link?
            <br />
            <span className="text-green">CheckRay it.</span>
          </div>

          {/* Body copy */}
          <div className="max-w-[32rem] mb-5 text-description max-lg:max-w-88 max-md:max-w-full max-md:mb-5">
            Paste a text, email, link, bill, job post, or screenshot. CheckRay helps spot ghost jobs, phishing messages, suspicious links, and scam red flags, with a Chrome extension coming soon.
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3 mb-4 max-md:mb-3">
            <Link
              href="/sign-up"
              className="relative inline-flex justify-center items-center h-11 px-6 rounded-xl text-title-5 text-white cursor-pointer transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #FF7A6B 0%, #FF9B5E 100%)',
                boxShadow: '0 0 28px rgba(255,112,90,0.50), 0 0 56px rgba(255,112,90,0.18), inset 0 1px 0 rgba(255,255,255,0.15)'
              }}
            >
              Start free trial
            </Link>
            <Link
              href="#how-it-works"
              className="relative inline-flex justify-center items-center h-11 px-5 rounded-xl text-title-5 text-white/75 cursor-pointer transition-all after:absolute after:inset-0 after:border after:border-white/12 after:rounded-xl after:pointer-events-none hover:text-white hover:after:border-white/30"
              style={{
                background: 'rgba(255,255,255,0.04)',
                boxShadow: '0.0625rem 0.0625rem 0.0625rem 0 rgba(255,255,255,0.08) inset'
              }}
            >
              See how Ray works
            </Link>
          </div>

          {/* Supporting note */}
          <div className="max-w-[27rem] text-[11px] leading-5 text-white/35 max-md:mb-8">
            Works for scams, phishing, fake recruiters, suspicious links, bills, and more. Ray can be wrong. Results are informational only.
          </div>

          <PhoneVideoDemo />
        </div>
      </motion.div>

      {/* Video orb — shifted slightly right */}
      <div className="absolute top-16 right-[calc(50%-44.25rem)] size-178 rounded-full max-xl:size-140 max-xl:right-[calc(50%-33.75rem)] max-lg:right-[calc(50%-16rem)] max-md:top-36 max-md:right-auto max-md:left-8.5 max-md:size-133">
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
        <div className="absolute top-61.5 right-[calc(50%-37rem)] z-[2] size-116.5 bg-green/20 rounded-full blur-[8rem] max-lg:-right-96 max-md:top-36 max-md:left-74 max-md:right-auto" />
        <div className="absolute top-77 left-[calc(50%-57.5rem)] z-[2] size-116.5 bg-green/20 rounded-full blur-[8rem] max-lg:-left-60 max-md:top-84 max-md:-left-52 max-md:size-80" />
      </div>
    </div>
  )
}
