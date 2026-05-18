'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

const cards = [
  {
    num: '01',
    title: 'Send it to Ray',
    body: 'Paste a message, link, screenshot, job post, bill, or email.',
    image: '/images/details-pic-1.png',
    className: 'lg:col-span-5 xl:col-span-5 min-h-80',
    imageClassName:
      'absolute -right-12 bottom-0 w-70 opacity-80 max-xl:w-56 max-lg:-right-8 max-md:w-52'
  },
  {
    num: '02',
    title: 'Ray checks for red flags',
    body: 'Ray looks for fake-check patterns, urgency, impersonation, suspicious payment requests, sketchy domains, and ghost-job signals.',
    image: '/images/details-pic-2.png',
    className: 'lg:col-span-4 xl:col-span-4 min-h-80',
    imageClassName:
      'absolute -right-8 top-2 w-66 opacity-75 max-xl:w-52 max-lg:-right-4 max-md:w-48'
  },
  {
    num: '03',
    title: 'Get a plain-English answer',
    body: 'See the risk score, common red flags, and what to do next.',
    image: '/images/details-pic-3.png',
    className: 'lg:col-span-3 xl:col-span-3 min-h-80',
    imageClassName:
      'absolute left-1/2 top-0 w-64 -translate-x-1/2 opacity-70 max-xl:w-52 max-md:w-48'
  }
]

const cardBase =
  'relative isolate overflow-hidden rounded-[1.25rem] bg-content shadow-2 backdrop-blur-[1.25rem] after:absolute after:inset-0 after:rounded-[1.25rem] after:border after:border-line after:pointer-events-none'

function IconTile({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative mb-6 flex size-12 shrink-0 items-center justify-center rounded-lg max-md:mb-5"
      style={{
        background:
          'linear-gradient(180deg, rgba(122,226,207,0.28), rgba(27,140,119,0.16))',
        boxShadow:
          '0 0 28px rgba(122,226,207,0.18), inset 0 1px 0 rgba(255,255,255,0.16)'
      }}
    >
      {children}
    </div>
  )
}

function BentoCard({
  card,
  index
}: {
  card: (typeof cards)[number]
  index: number
}) {
  return (
    <motion.div
      className={`${cardBase} ${card.className} flex p-8 max-xl:p-7 max-md:min-h-72 max-md:p-6`}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.08, duration: 0.55 }}
      viewport={{ amount: 0.35, once: true }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(122,226,207,0.14),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_45%)]" />
      <div className="absolute -bottom-24 -right-20 size-64 rounded-full bg-green/10 blur-[4.5rem]" />
      <div className="pointer-events-none absolute right-5 top-4 font-helvetica text-[5.5rem] leading-none tracking-normal text-white/[0.045] max-md:text-[4rem]">
        {card.num}
      </div>

      <Image
        src={card.image}
        alt=""
        width={345}
        height={300}
        className={`${card.imageClassName} pointer-events-none select-none`}
      />

      <div className="relative z-[2] mt-auto max-w-86">
        <IconTile>
          <span className="size-2.5 rounded-full bg-green shadow-[0_0_18px_rgba(122,226,207,0.9)]" />
        </IconTile>
        <div className="mb-3 max-w-72 bg-radial-white-2 bg-clip-text text-title-3 text-transparent max-md:text-title-2-mobile">
          {card.title}
        </div>
        <div className="text-description-2 text-description max-md:text-description-mobile">
          {card.body}
        </div>
      </div>
    </motion.div>
  )
}

export default function Details() {
  return (
    <div
      id="how-it-works"
      className="relative pt-30 pb-28 max-xl:pt-24 max-lg:py-20 max-md:py-14"
    >
      <div className="center">
        <div className="relative mx-auto mb-10 max-w-170 text-center max-md:mb-8">
          <div className="absolute left-1/2 top-1/2 -z-10 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green/10 blur-[6rem]" />
          <div className="label mb-3 max-md:mb-1">How it works</div>
          <div className="mb-4 bg-radial-white-2 bg-clip-text text-title-1 text-transparent max-lg:text-title-2 max-md:text-title-1-mobile">
            Three steps. No tech skills required.
          </div>
          <div className="mx-auto max-w-150 text-description">
            Paste a message, link, screenshot, job post, bill, or email. Ray checks for
            common risk signals and gives you a plain-English readout.
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {cards.map((card, index) => (
            <BentoCard key={card.num} card={card} index={index} />
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <motion.div
            className={`${cardBase} min-h-45 px-8 py-7 lg:col-span-8 max-md:px-6 max-md:py-6`}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.55 }}
            viewport={{ amount: 0.35, once: true }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(122,226,207,0.18),transparent_36%),linear-gradient(90deg,rgba(255,255,255,0.08),transparent_62%)]" />
            <Image
              src="/images/details-pic-4.png"
              alt=""
              width={744}
              height={188}
              className="pointer-events-none absolute right-0 top-0 h-full w-auto max-w-none opacity-60 max-md:right-[-8rem]"
            />
            <div className="relative z-[2] flex items-center gap-5 max-md:items-start">
              <IconTile>
                <Image
                  src="/images/lightning.svg"
                  alt=""
                  width={15}
                  height={22}
                  className="w-4"
                />
              </IconTile>
              <div className="flex items-end gap-4 max-md:flex-col max-md:items-start max-md:gap-2">
                <div className="bg-radial-white-2 bg-clip-text text-title-1 text-transparent max-xl:text-title-2 max-md:text-title-1-mobile">
                  ~3s
                </div>
                <div className="pb-3 text-title-4 text-description max-xl:pb-2 max-md:pb-0 max-md:text-title-2-mobile">
                  Average risk readout
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className={`${cardBase} min-h-45 px-8 py-7 lg:col-span-4 max-md:px-6 max-md:py-6`}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.55 }}
            viewport={{ amount: 0.35, once: true }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(122,226,207,0.14),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.07),transparent_55%)]" />
            <Image
              src="/images/details-pic-5.png"
              alt=""
              width={250}
              height={175}
              className="pointer-events-none absolute -right-6 top-0 w-48 opacity-50 max-md:w-40"
            />
            <div className="relative z-[2]">
              <div className="mb-2 bg-radial-white-2 bg-clip-text text-title-1 text-transparent max-xl:text-title-2 max-md:text-title-1-mobile">
                100%
              </div>
              <div className="max-w-72 text-description-2 text-description">
                Informational only. Ray can be wrong. Verify through official
                channels before acting.
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
