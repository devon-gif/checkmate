/**
 * CheckRay shared animation system.
 *
 * Goals:
 * - Premium, subtle motion. No bouncy / cartoony springs.
 * - Consistent timing and easing across sections.
 * - Only animate transform / opacity / filter for performance.
 * - Respect prefers-reduced-motion at the call site (see `useReducedMotion`).
 *
 * Usage:
 *   import { fadeUp, staggerContainer, cardHover } from '@/lib/animations'
 *   <motion.div variants={fadeUp} initial="initial" whileInView="animate" />
 *
 * Keep ALL motion objects here so we never duplicate animation values.
 */

import type { Variants } from 'framer-motion'

/** Premium ease — cubic-bezier(0.22, 1, 0.36, 1). Used everywhere. */
export const easePremium: [number, number, number, number] = [0.22, 1, 0.36, 1]

/** Default viewport config for whileInView reveals. */
export const defaultViewport = { amount: 0.25, once: true } as const

/** Fade up — the workhorse reveal. */
export const fadeUp: Variants = {
  initial: { opacity: 0, y: 18 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easePremium }
  }
}

/** Plain fade in (no movement). For non-text/decorative reveals. */
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.5, ease: easePremium }
  }
}

/**
 * Stagger container. Wrap a list of motion children that use `fadeUp` /
 * `fadeIn` / `glassReveal` and they'll cascade in.
 */
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.05
    }
  }
}

/**
 * Card hover — subtle scale + border glow handled in CSS, here we only own
 * the transform timing.
 */
export const cardHover: Variants = {
  rest: {
    scale: 1,
    transition: { duration: 0.5, ease: easePremium }
  },
  hover: {
    scale: 1.015,
    transition: { duration: 0.4, ease: easePremium }
  }
}

/**
 * Glass reveal — fade + slide + subtle blur in. Looks premium on glass
 * panels (Hero CTA box, Pricing cards, ScamWatch panel).
 *
 * NOTE: animating filter is more expensive than transform/opacity. Use
 * sparingly (not per-item in long lists).
 */
export const glassReveal: Variants = {
  initial: { opacity: 0, y: 24, filter: 'blur(8px)' },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: easePremium }
  }
}

/**
 * Slow float — *only* for decorative orbs / accents. Extremely subtle.
 * Do NOT apply to the phone or anything that contains video, text, or UI.
 */
export const slowFloat: Variants = {
  initial: { y: 0 },
  animate: {
    y: [0, -6, 0],
    transition: {
      duration: 9,
      ease: 'easeInOut',
      repeat: Infinity,
      repeatType: 'mirror'
    }
  }
}

/**
 * Draw a stroked SVG path. Pair with `<motion.path>` and animate
 * `pathLength` from 0 → 1. Returns props you can spread.
 *
 * Example:
 *   <motion.path d="..." {...drawLine({ active: hovered, duration: 0.9 })} />
 */
export function drawLine(opts: {
  active: boolean
  duration?: number
  delay?: number
}) {
  const { active, duration = 0.9, delay = 0 } = opts
  return {
    initial: { pathLength: 0, opacity: 0 },
    animate: {
      pathLength: active ? 1 : 0,
      opacity: active ? 1 : 0
    },
    transition: {
      pathLength: { duration, ease: easePremium, delay },
      opacity: { duration: Math.min(0.35, duration / 2), ease: 'easeOut', delay }
    }
  } as const
}

/**
 * Helper to build a `fadeUp` with a custom delay without redefining the
 * whole variant.
 */
export function fadeUpAt(delay: number): Variants {
  return {
    initial: { opacity: 0, y: 18 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: easePremium, delay }
    }
  }
}
