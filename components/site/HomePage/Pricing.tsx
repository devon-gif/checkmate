'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

const pricing = [
  {
    title: 'FREE',
    price: 0,
    cta: 'Try a free check',
    href: '/try',
    features: [
      'First risk check on us',
      'Text, web, or upload',
      'Risk score and possible red flags',
      'Plain-English suggested next step',
      'No account required'
    ]
  },
  {
    title: 'PRO',
    price: 9.99,
    cta: 'Join the waitlist',
    href: '/sign-up',
    features: [
      'Unlimited risk checks',
      'Forward suspicious emails to Ray',
      'Saved case history and notes',
      'Draft a safer reply, automatically',
      'Priority response and updates'
    ]
  },
  {
    title: 'FAMILY',
    price: 19.99,
    cta: 'Notify me when it launches',
    href: '/sign-up',
    features: [
      'Everything in Pro',
      'Up to 5 household members',
      'Shared trusted-contacts list',
      'Help a family member from your phone',
      'One bill for everyone'
    ]
  }
]

const checkSvg = (
  <svg
    className="size-5 fill-deep"
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 20 20"
  >
    <path d="M13.47 6.97A.75.75 0 0 1 14.53 8.03l-5 5a.75.75 0 0 1-1.061 0l-3-3A.75.75 0 0 1 6.53 8.97L9 11.439l4.47-4.469z" />
  </svg>
)

export default function Pricing() {
  return (
    <div
      id="pricing"
      className="pt-34.5 pb-25 max-2xl:pt-25 max-lg:py-20 max-md:py-15"
    >
      <div className="center">
        <motion.div
          className="max-w-175 mx-auto mb-17.5 text-center max-xl:mb-14 max-md:mb-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          viewport={{ amount: 0.7 }}
        >
          <div className="label mb-3 max-md:mb-1.5">Pricing</div>
          <div className="bg-radial-white-2 bg-clip-text text-transparent text-title-1 max-lg:text-title-2 max-md:text-title-1-mobile">
            Free to start. Pro coming soon.
          </div>
          <div className="mt-4 text-description">
            Your first check is free. No account needed. Upgrade later when
            you want unlimited checks and saved history.
          </div>
        </motion.div>
        <motion.div
          className="flex gap-4 max-lg:-mx-10 max-lg:px-10 max-lg:overflow-x-auto max-md:-mx-5 max-md:px-5"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          viewport={{ amount: 0.35 }}
        >
          {pricing.map((item, index) => {
            const isPro = item.title === 'PRO'
            return (
              <div
                key={index}
                className={`relative flex flex-col flex-1 rounded-[1.25rem] overflow-hidden after:absolute after:inset-0 after:border after:border-line after:rounded-[1.25rem] after:pointer-events-none max-lg:shrink-0 max-lg:flex-auto max-lg:w-84 ${
                  isPro
                    ? 'shadow-2 before:absolute before:-top-20 before:left-1/2 before:z-[1] before:-translate-x-1/2 before:w-65 before:h-57 before:bg-green/10 before:rounded-full before:blur-[3.375rem]'
                    : 'shadow-[0.0625rem_0.0625rem_0.0625rem_0_rgba(255,255,255,0.10)_inset]'
                }`}
              >
                {isPro && (
                  <div className="absolute -top-36 left-13 w-105 mask-radial">
                    <video
                      className="w-full"
                      src="/videos/video-1.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  </div>
                )}
                <div
                  className={`relative z-[2] pt-8 px-8.5 pb-10 text-title-4 max-md:text-title-5 ${
                    isPro
                      ? 'bg-[#175673]/20 rounded-t-[1.25rem] text-green'
                      : 'text-white'
                  }`}
                >
                  {item.title}
                </div>
                <div
                  className={`relative z-[3] flex flex-col grow -mt-5 p-3.5 pb-8 rounded-[1.25rem] after:absolute after:inset-0 after:border after:border-line after:rounded-[1.25rem] after:pointer-events-none ${
                    isPro
                      ? 'backdrop-blur-[2rem] shadow-2 bg-white/[0.07]'
                      : 'backdrop-blur-[1.25rem] bg-white/[0.01]'
                  }`}
                >
                  <div
                    className={`relative mb-8 p-5 rounded-[0.8125rem] backdrop-blur-[1.25rem] shadow-2 after:absolute after:inset-0 after:border after:border-line after:rounded-[0.8125rem] after:pointer-events-none ${
                      isPro ? 'bg-line' : 'bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-end gap-3 mb-4">
                      <div className="bg-radial-white-2 bg-clip-text text-transparent text-title-1 leading-[3.1rem] max-xl:text-title-2 max-xl:leading-[2.4rem]">
                        ${item.price}
                      </div>
                      <div className="text-title-5 text-white">/Month</div>
                    </div>
                    <Link
                      href={item.href}
                      className={`relative inline-flex justify-center items-center w-full h-10 px-3.5 rounded-lg text-title-5 cursor-pointer transition-all ${
                        isPro
                          ? 'bg-white text-deep hover:bg-white/90'
                          : 'bg-line text-description hover:text-white after:absolute after:inset-0 after:border after:border-line after:rounded-lg after:pointer-events-none'
                      }`}
                    >
                      {item.cta}
                    </Link>
                  </div>
                  <div className="flex flex-col gap-6.5 px-3.5 max-xl:px-0 max-xl:gap-5 max-md:px-3.5">
                    {item.features.map((feature, fi) => (
                      <div
                        key={fi}
                        className="flex items-center gap-2.5 text-description max-xl:text-description-2 max-md:text-description-mobile"
                      >
                        <div className="flex justify-center items-center shrink-0 size-5 bg-green rounded-full shadow-[0.0625rem_0.0625rem_0.0625rem_0_rgba(255,255,255,0.20)_inset,_0_0_0.625rem_0_rgba(255,255,255,0.50)_inset]">
                          {checkSvg}
                        </div>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </motion.div>
        <div className="mt-13.5 text-center text-description max-md:mt-8 max-md:text-title-3-mobile">
          Informational only. Ray can be wrong. Verify through official
          channels before acting.
        </div>
      </div>
    </div>
  )
}
