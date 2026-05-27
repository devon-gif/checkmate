'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'

const VIDEO_SRC = '/videos/checkray-homepage-video.mp4'

export default function DemoVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  async function playVideo() {
    const video = videoRef.current
    if (!video) return

    video.muted = false
    video.volume = 1
    await video.play()
    setIsPlaying(true)
  }

  return (
    <section
      id="demo-video"
      className="relative py-20 max-lg:py-16 max-md:py-12"
    >
      <div className="pointer-events-none absolute inset-x-[18%] top-10 -z-10 h-[70%] rounded-full bg-green/10 blur-[7rem]" />
      <div className="pointer-events-none absolute left-[calc(50%-32rem)] top-24 -z-10 size-72 rounded-full bg-green/8 blur-[5rem] max-md:hidden" />

      <div className="center relative z-[2]">
        <div className="mx-auto mb-10 max-w-3xl text-center max-md:mb-7">
          <div className="label mb-3 max-md:mb-1">See CheckRay in action</div>
          <h2 className="mb-4 bg-radial-white-2 bg-clip-text text-title-1 text-transparent max-lg:text-title-2 max-md:text-title-1-mobile">
            From suspicious message to safer next step.
          </h2>
          <p className="mx-auto max-w-2xl text-description">
            Paste the message, link, email, bill, or job offer. Ray checks for
            red flags and gives you a plain-English risk readout before you act.
          </p>
        </div>

        <div
          className="relative mx-auto max-w-[68rem] overflow-hidden rounded-[1.5rem] p-2 after:pointer-events-none after:absolute after:inset-0 after:rounded-[1.5rem] after:border after:border-line max-md:rounded-[1.1rem] max-md:p-1.5 max-md:after:rounded-[1.1rem]"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.025))',
            boxShadow:
              '0 0 0 1px rgba(122,226,207,0.08), 0 36px 90px rgba(0,0,0,0.42), 0 0 70px rgba(122,226,207,0.10)',
            backdropFilter: 'blur(22px)'
          }}
        >
          <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-green/15 blur-[5rem]" />
          <div className="pointer-events-none absolute -bottom-28 right-16 size-72 rounded-full bg-green/10 blur-[5rem]" />

          <div className="relative overflow-hidden rounded-[1.15rem] border border-white/10 bg-black/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] max-md:rounded-[0.9rem]">
            <video
              ref={videoRef}
              className="block aspect-video w-full bg-black object-cover"
              controls={isPlaying}
              playsInline
              preload="metadata"
              aria-label="CheckRay homepage product demo"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            >
              <source src={VIDEO_SRC} type="video/mp4" />
              Your browser does not support the video tag.
            </video>

            {!isPlaying && (
              <button
                type="button"
                onClick={playVideo}
                className="absolute inset-0 flex items-center justify-center bg-black/18 transition hover:bg-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-green/70"
                aria-label="Play CheckRay demo video"
              >
                <span
                  className="flex size-20 items-center justify-center rounded-full border border-white/20 bg-green text-deep shadow-[0_0_42px_rgba(122,226,207,0.45),inset_0_1px_0_rgba(255,255,255,0.35)] transition hover:scale-105 max-md:size-16"
                  aria-hidden
                >
                  <span className="ml-1 h-0 w-0 border-y-[13px] border-l-[20px] border-y-transparent border-l-deep max-md:border-y-[10px] max-md:border-l-[16px]" />
                </span>
              </button>
            )}
          </div>
        </div>

        <p className="mx-auto mt-5 max-w-xl text-center text-[11px] leading-5 text-white/35">
          Informational only. Verify important decisions through official
          sources.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3 max-md:mt-5">
          <Link
            href="/try"
            className="relative inline-flex h-11 items-center justify-center rounded-xl px-6 text-title-5 text-white transition-all hover:scale-[1.02] hover:opacity-90 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #FF7A6B 0%, #FF9B5E 100%)',
              boxShadow:
                '0 0 28px rgba(255,112,90,0.45), 0 0 56px rgba(255,112,90,0.16), inset 0 1px 0 rgba(255,255,255,0.15)'
            }}
          >
            Start your first check
          </Link>
          <Link
            href="#features"
            className="relative inline-flex h-11 items-center justify-center rounded-xl px-5 text-title-5 text-white/75 transition-all after:pointer-events-none after:absolute after:inset-0 after:rounded-xl after:border after:border-white/12 hover:text-white hover:after:border-white/30"
            style={{
              background: 'rgba(255,255,255,0.04)',
              boxShadow:
                '0.0625rem 0.0625rem 0.0625rem 0 rgba(255,255,255,0.08) inset'
            }}
          >
            See what Ray checks
          </Link>
        </div>
      </div>
    </section>
  )
}
