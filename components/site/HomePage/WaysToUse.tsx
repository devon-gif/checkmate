'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { fadeUp, fadeIn, staggerContainer } from '@/lib/animations'

const ways = [
  {
    title: 'Text Ray',
    description:
      'Send a suspicious message and get a risk readout back in seconds.',
    badge: 'Coming soon' as string | null
  },
  {
    title: 'Email Ray',
    description:
      'Forward suspicious emails before you click links, open attachments, or reply.',
    badge: 'Coming soon' as string | null
  },
  {
    title: 'Use the Chrome extension',
    description:
      'Check job posts, websites, and suspicious pages without leaving your browser.',
    badge: 'Coming soon' as string | null
  },
  {
    title: 'Paste it on the web',
    description:
      'Drop a message, link, screenshot, or job post into CheckRay. No account required for your first check.',
    badge: 'Available now' as string | null
  },
  {
    title: 'Save to dashboard',
    description:
      'Every check is saved automatically. Review your risk history, re-read red flags, and pick up where you left off.',
    badge: null as string | null
  },
  {
    title: 'Weekly Scam Watch',
    description:
      'Ray sends a weekly email roundup of dangerous scam patterns, ghost jobs, phishing links, and suspicious messages to watch for.',
    badge: null as string | null
  }
]

export default function WaysToUse() {
  const reduced = useReducedMotion()
  return (
    <div
      id="ways-to-use"
      className="relative pt-34.5 pb-30 max-xl:pt-20 max-xl:pb-24 max-lg:py-20 max-md:py-15"
    >
      <div className="center relative z-[2]">
        <motion.div
          className="max-w-148 mx-auto mb-14 text-center max-xl:mb-12 max-md:mb-8"
          variants={fadeIn}
          initial="initial"
          whileInView="animate"
          viewport={{ amount: 0.5, once: true }}
        >
          <div className="label mb-3 max-md:mb-1">Ways to use</div>
          <div className="mb-4 bg-radial-white-2 bg-clip-text text-transparent text-title-1 max-lg:text-title-2 max-md:mb-3 max-md:text-title-1-mobile">
            A scam expert in your pocket.
          </div>
          <div className="text-description">
            Whether it came by text, email, job board, marketplace, or a random link, Ray gives you a second look before you click, pay, reply, or apply.
          </div>
        </motion.div>
        <motion.div
          className="flex flex-wrap -mt-4 -mx-2"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ amount: 0.15, once: true }}
        >
          {ways.map((item, index) => (
            <motion.div
              key={item.title}
              className="relative w-[calc(33.333%-1rem)] mt-4 mx-2 p-6 rounded-[1.25rem] bg-content shadow-2 backdrop-blur-[1.25rem] after:absolute after:inset-0 after:border after:border-line after:rounded-[1.25rem] after:pointer-events-none max-lg:w-[calc(50%-1rem)] max-md:w-[calc(100%-1rem)] max-md:p-5 transition-shadow duration-500 hover:shadow-[0_0_40px_rgba(122,226,207,0.10)]"
              variants={fadeUp}
              whileHover={reduced ? undefined : { y: -3 }}
            >
              {item.badge && (
                <span className="absolute top-4 right-4 inline-flex items-center h-6 px-2.5 rounded-full bg-green/15 text-description-3 text-green">
                  {item.badge}
                </span>
              )}
              <div className="relative flex justify-center items-center size-11 mb-5 rounded-lg bg-gradient-to-b from-black/15 to-white/15 shadow-[0.0625rem_0.0625rem_0.0625rem_0_rgba(255,255,255,0.10)_inset,_0_0_0.625rem_0_rgba(255,255,255,0.10)_inset]">
                <div className="absolute inset-0 border border-line rounded-lg pointer-events-none" />
                <span className="text-title-4 text-green">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <div className="mb-2 text-title-4 text-white max-md:text-title-2-mobile">
                {item.title}
              </div>
              <div className="text-description-2 text-description">{item.description}</div>
            </motion.div>
          ))}
        </motion.div>
        <p className="mt-8 text-center text-[11px] leading-5 text-white/35 max-md:mt-6">
          Text and email workflows are planned for launch / early access. Chrome extension coming soon.
        </p>
      </div>
      <div className="max-md:hidden">
        <div className="absolute -bottom-10 left-[calc(50%-40rem)] size-80 bg-green/15 rounded-full blur-[7rem]" />
        <div className="absolute -top-10 right-[calc(50%-40rem)] size-80 bg-green/15 rounded-full blur-[7rem]" />
      </div>
    </div>
  )
}
