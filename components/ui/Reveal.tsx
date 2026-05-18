'use client'

import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion'
import { type ReactNode } from 'react'
import { easePremium, defaultViewport } from '@/lib/animations'

type Variant = 'fadeUp' | 'fadeIn' | 'glass'

type RevealProps = {
  children: ReactNode
  /** Which reveal style to use. Defaults to 'fadeUp'. */
  variant?: Variant
  /** Delay before reveal in seconds */
  delay?: number
  /** Duration in seconds (overrides variant default) */
  duration?: number
  className?: string
  /** Trigger amount for viewport (0-1) */
  amount?: number
  /** Animate once or every time it scrolls into view */
  once?: boolean
} & Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'whileInView' | 'transition' | 'viewport'>

/**
 * Scroll reveal wrapper. Consistent fade/slide/blur reveals via
 * `@/lib/animations`. Respects prefers-reduced-motion (renders content
 * instantly with no transform).
 */
export function Reveal({
  children,
  variant = 'fadeUp',
  delay = 0,
  duration,
  amount = defaultViewport.amount,
  once = defaultViewport.once,
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

  const initial =
    variant === 'fadeIn'
      ? { opacity: 0 }
      : variant === 'glass'
      ? { opacity: 0, y: 24, filter: 'blur(8px)' }
      : { opacity: 0, y: 18 }

  const animate =
    variant === 'fadeIn'
      ? { opacity: 1 }
      : variant === 'glass'
      ? { opacity: 1, y: 0, filter: 'blur(0px)' }
      : { opacity: 1, y: 0 }

  const fallbackDuration =
    variant === 'fadeIn' ? 0.5 : variant === 'glass' ? 0.7 : 0.6

  return (
    <motion.div
      className={className}
      initial={initial}
      whileInView={animate}
      transition={{ delay, duration: duration ?? fallbackDuration, ease: easePremium }}
      viewport={{ amount, once }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

export default Reveal
