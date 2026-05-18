'use client'

import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion'
import { type ReactNode } from 'react'

type RevealProps = {
  children: ReactNode
  /** Delay before reveal in seconds */
  delay?: number
  /** y offset for slide-up. Set to 0 to disable slide */
  y?: number
  /** Apply subtle blur in. Defaults to true */
  blur?: boolean
  /** Duration in seconds */
  duration?: number
  className?: string
  /** Trigger amount for viewport (0-1) */
  amount?: number
  /** Animate once or every time it scrolls into view */
  once?: boolean
  /** Optional element type override */
  as?: keyof typeof motion
} & Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'whileInView' | 'transition' | 'viewport'>

/**
 * Premium scroll reveal. Subtle fade + small slide + optional blur in.
 * Respects prefers-reduced-motion (renders content instantly with no transform).
 */
export function Reveal({
  children,
  delay = 0,
  y = 16,
  blur = true,
  duration = 0.6,
  amount = 0.25,
  once = true,
  className,
  ...rest
}: RevealProps) {
  const reduced = useReducedMotion()

  if (reduced) {
    return (
      <div className={className} {...(rest as any)}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: blur ? 'blur(6px)' : 'blur(0px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ delay, duration, ease: [0.22, 1, 0.36, 1] }}
      viewport={{ amount, once }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

export default Reveal
