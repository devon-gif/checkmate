'use client'

import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { fadeUp, fadeIn, staggerContainer } from '@/lib/animations'

const features = [
  {
    title: 'Ghost jobs & fake recruiters',
    description:
      'Check job posts, recruiter messages, interview links, and payment or equipment requests before you apply.',
    image: '/images/features-pic-2.png'
  },
  {
    title: 'Phishing links & scam texts',
    description:
      'Paste suspicious messages or URLs and get a plain-English risk readout.',
    image: '/images/features-pic-1.png'
  },
  {
    title: 'Suspicious bills & payments',
    description:
      'Ray helps you ask for itemization, verify official channels, and avoid rushed payments.',
    image: '/images/features-pic-3.png'
  },
  {
    title: 'Bills, rentals & listings',
    description:
      'Unexpected invoices, rental scams, marketplace messages, and forwarded emails.',
    image: '/images/features-pic-4.png'
  }
]

export default function Features() {
  const reduced = useReducedMotion()
  return (
    <div
      id="features"
      className="relative pt-34.5 pb-41 max-xl:pt-20 max-xl:pb-30 max-lg:py-24 max-md:pt-15 max-md:pb-14"
    >
      <div className="center relative z-[2]">
        <motion.div
          className="max-w-148 mx-auto mb-18 text-center max-xl:mb-14 max-md:mb-8.5"
          variants={fadeIn}
          initial="initial"
          whileInView="animate"
          viewport={{ amount: 0.5, once: true }}
        >
          <div className="label mb-3 max-md:mb-1">What Ray can check</div>
          <div className="mb-6 bg-radial-white-2 bg-clip-text text-transparent text-title-1 max-lg:text-title-2 max-md:mb-3 max-md:text-title-1-mobile">
            Not just link protection. A second look for real-life scams.
          </div>
          <div className="text-description">
            CheckRay isn&apos;t a generic antivirus or a phishing-link-only tool.
            It&apos;s a second look for ghost jobs, scam texts, suspicious payments, and the everyday situations where something just feels off.
          </div>
        </motion.div>
        <motion.div
          className="flex flex-wrap -mt-4 -mx-2"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ amount: 0.15, once: true }}
        >
          {features.map((item, index) => (
            <motion.div
              key={index}
              className="relative w-[calc(25%-1rem)] mt-4 mx-2 rounded-[1.25rem] bg-content shadow-2 backdrop-blur-[1.25rem] after:absolute after:inset-0 after:border after:border-line after:rounded-[1.25rem] after:pointer-events-none max-lg:w-[calc(50%-1rem)] max-md:w-[calc(100%-1rem)] transition-shadow duration-500 hover:shadow-[0_0_40px_rgba(122,226,207,0.10)]"
              variants={fadeUp}
              whileHover={reduced ? undefined : { y: -3 }}
            >
              <div className="max-md:text-center">
                <Image
                  className="w-full max-md:max-w-73.5"
                  src={item.image}
                  width={306}
                  height={226}
                  alt=""
                />
              </div>
              <div className="pt-0.5 px-8.5 pb-7.5 max-xl:px-5 max-xl:pb-5 max-lg:px-8 max-lg:pb-7 max-md:pb-6">
                <div className="mb-2.5 text-title-4 text-white max-md:mb-1 max-md:text-title-2-mobile">
                  {item.title}
                </div>
                <div className="text-description">{item.description}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
      <div className="max-md:hidden">
        <div className="absolute top-47.5 left-[calc(50%-52.38rem)] size-98.5 bg-green/20 rounded-full blur-[6.75rem]" />
        <div className="absolute bottom-2.5 right-[calc(50%-51.44rem)] size-98.5 bg-green/20 rounded-full blur-[6.75rem]" />
      </div>
    </div>
  )
}
