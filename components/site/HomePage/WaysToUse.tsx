'use client'

import { motion } from 'framer-motion'

const ways = [
  {
    title: 'Text Ray',
    description:
      'Send a suspicious message straight to our number. You\u2019ll get a risk readout back in seconds.',
    badge: 'Most popular'
  },
  {
    title: 'Forward an email',
    description:
      'Forward a phishing-looking email and Ray reads the headers and body for risk signals.',
    badge: null as string | null
  },
  {
    title: 'Paste a link',
    description:
      'Drop a sketchy URL into CheckRay on the web. No account required for your first check.',
    badge: null as string | null
  },
  {
    title: 'Upload a bill or screenshot',
    description:
      'Snap a photo of an unexpected invoice, rental listing, or marketplace message.',
    badge: null as string | null
  },
  {
    title: 'Save to home screen',
    description:
      'Add CheckRay to your phone\u2019s home screen for one-tap access when something feels off.',
    badge: 'Coming soon'
  }
]

export default function WaysToUse() {
  return (
    <div
      id="ways-to-use"
      className="relative pt-34.5 pb-30 max-xl:pt-20 max-xl:pb-24 max-lg:py-20 max-md:py-15"
    >
      <div className="center relative z-[2]">
        <motion.div
          className="max-w-148 mx-auto mb-14 text-center max-xl:mb-12 max-md:mb-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          viewport={{ amount: 0.7 }}
        >
          <div className="label mb-3 max-md:mb-1">Ways to use</div>
          <div className="mb-4 bg-radial-white-2 bg-clip-text text-transparent text-title-1 max-lg:text-title-2 max-md:mb-3 max-md:text-title-1-mobile">
            However the message arrived, Ray can help.
          </div>
          <div className="text-description">
            Send it the way that feels easiest. CheckRay meets you on the
            channel you already trust.
          </div>
        </motion.div>
        <div className="flex flex-wrap -mt-4 -mx-2">
          {ways.map((item, index) => (
            <motion.div
              key={item.title}
              className="relative w-[calc(33.333%-1rem)] mt-4 mx-2 p-6 rounded-[1.25rem] bg-content shadow-2 backdrop-blur-[1.25rem] after:absolute after:inset-0 after:border after:border-line after:rounded-[1.25rem] after:pointer-events-none max-lg:w-[calc(50%-1rem)] max-md:w-[calc(100%-1rem)] max-md:p-5"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.1 + index * 0.05, duration: 0.6 }}
              viewport={{ amount: 0.4 }}
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
              <div className="text-description-2 text-description">
                {item.description}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="max-md:hidden">
        <div className="absolute -bottom-10 left-[calc(50%-40rem)] size-80 bg-green/15 rounded-full blur-[7rem]" />
        <div className="absolute -top-10 right-[calc(50%-40rem)] size-80 bg-green/15 rounded-full blur-[7rem]" />
      </div>
    </div>
  )
}
