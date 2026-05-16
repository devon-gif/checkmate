'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

const stylesItem =
  'relative min-h-75 rounded-[1.25rem] bg-content shadow-2 backdrop-blur-[1.25rem] after:absolute after:inset-0 after:border after:border-line after:rounded-[1.25rem] after:pointer-events-none max-xl:min-h-70'

type Item1Props = {
  title: string
  subtitle: string
  content: string
  image: string
}

function Item1({ title, subtitle, content, image }: Item1Props) {
  return (
    <motion.div
      className={`${stylesItem} flex w-[calc(50%-1rem)] h-full mt-4 mx-2 pt-6 pb-7 px-8.5 max-xl:px-6 max-lg:w-[calc(100%-1rem)] max-md:px-8 max-md:min-h-112.5`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.7 }}
      viewport={{ amount: 0.3 }}
    >
      <div className="relative z-[2] max-w-58 flex flex-col max-md:max-w-full">
        <div className="mb-auto bg-radial-white-2 bg-clip-text text-transparent text-title-1 max-xl:text-title-2 max-md:mb-0.5 max-md:text-title-1-mobile">
          {title}
        </div>
        <div className="mt-3 text-title-4 text-white max-md:text-title-3-mobile">
          {subtitle}
        </div>
        <div className="mt-2.5 text-description max-md:mt-2">{content}</div>
      </div>
      <div className="absolute top-0 right-0 bottom-0 flex items-center max-2xl:-right-16 max-lg:right-0 max-md:top-auto max-md:left-0 max-md:pl-7.5">
        <Image
          className="w-86.25 max-xl:w-72 max-md:w-full"
          src={image}
          width={345}
          height={300}
          alt=""
        />
      </div>
    </motion.div>
  )
}

type Item2Props = {
  title?: string
  subtitle?: string
  content: string
  image: string
}

function Item2({ title, subtitle, content, image }: Item2Props) {
  return (
    <motion.div
      className={`${stylesItem} flex items-end w-62.5 mt-4 mx-2 px-8.5 pb-7 max-xl:px-6 max-lg:w-[calc(50%-1rem)] max-md:w-[calc(100%-1rem)] max-md:min-h-72 max-md:px-7 max-md:pb-6`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.7 }}
      viewport={{ amount: 0.3 }}
    >
      <div className="absolute top-0 left-0 right-0 flex justify-center">
        <Image
          className="w-full max-lg:max-w-60 max-md:max-w-73.5"
          src={image}
          width={250}
          height={175}
          alt=""
        />
      </div>
      <div className="relative z-[2] max-w-58 flex flex-col">
        {title && (
          <div className="bg-radial-white-2 bg-clip-text text-transparent text-title-1 max-xl:text-title-2 max-md:text-title-1-mobile">
            {title}
          </div>
        )}
        {subtitle && (
          <div className="mb-2.5 text-title-4 text-white max-md:mb-1.5 max-md:text-title-3-mobile">
            {subtitle}
          </div>
        )}
        <div className="text-description">{content}</div>
      </div>
    </motion.div>
  )
}

export default function Details() {
  return (
    <div
      id="how-it-works"
      className="pt-40.5 pb-30.5 max-xl:pt-30 max-lg:py-24 max-md:py-15"
    >
      <div className="center">
        <div className="max-w-148 mx-auto mb-14 text-center max-md:mb-8">
          <div className="label mb-3 max-md:mb-1">How it works</div>
          <div className="mb-4 bg-radial-white-2 bg-clip-text text-transparent text-title-1 max-lg:text-title-2 max-md:text-title-1-mobile">
            Three steps. No tech skills required.
          </div>
          <div className="text-description">
            Forward a message, paste a link, or upload a screenshot. Ray looks
            for common risk signals and gives you a plain-English readout.
          </div>
        </div>
        <div className="flex flex-wrap -mt-4 -mx-2">
          <Item1
            title="Free"
            subtitle="Send it to Ray"
            content="Text, forward, paste, or upload — text our number, forward an email, paste it on the web, or drop a screenshot. No account needed for your first check."
            image="/images/details-pic-1.png"
          />
          <Item1
            title="Seconds"
            subtitle="Ray checks for red flags"
            content="Ray looks for common risk signals — urgency language, lookalike links, impersonation patterns, and unusual money asks."
            image="/images/details-pic-2.png"
          />
          <Item2
            subtitle="Plain-English answer"
            content="A risk score, the red flags Ray noticed, and what to do next. Ray can be wrong — verify through official channels."
            image="/images/details-pic-3.png"
          />
          <motion.div
            className={`${stylesItem} flex items-end grow mt-4 mx-2 px-8.5 pb-7 overflow-hidden max-xl:px-6 max-lg:order-5`}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            viewport={{ amount: 0.3 }}
          >
            <div className="absolute top-0 left-0 flex justify-center max-2xl:top-8 max-lg:top-0 max-md:-left-3 max-md:w-176">
              <Image
                className="w-full"
                src="/images/details-pic-4.png"
                width={744}
                height={188}
                alt=""
              />
            </div>
            <div className="relative z-[2] flex">
              <div className="relative flex justify-center items-center shrink-0 w-12.5 h-12.5 mr-5 rounded-lg bg-gradient-to-b from-[#42B39E] to-[#1B8C77] after:absolute after:inset-0 after:border after:border-line after:rounded-lg after:pointer-events-none">
                <Image
                  className="w-4 opacity-100"
                  src="/images/lightning.svg"
                  width={15}
                  height={22}
                  alt=""
                />
              </div>
              <div className="mr-2.5 bg-radial-white-2 bg-clip-text text-transparent text-title-1 leading-[3.1rem] max-xl:text-title-2 max-md:text-title-1-mobile">
                3s
              </div>
              <div className="self-end text-title-4 text-description max-xl:max-w-30 max-xl:text-description-2 max-xl:self-center max-lg:max-w-full max-lg:text-description">
                Average risk readout
              </div>
            </div>
          </motion.div>
          <Item2
            title="100%"
            content="Informational only — Ray can be wrong. Verify through official channels before acting."
            image="/images/details-pic-5.png"
          />
        </div>
      </div>
    </div>
  )
}
