import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

import { cn } from '@/lib/utils'

const CURRENT_YEAR = 2026

const SECTIONS = [
  { title: 'How it works', href: '/#how-it-works' },
  { title: 'What Ray checks', href: '/#features' },
  { title: 'Ways to use', href: '/#ways-to-use' },
  { title: 'Pricing', href: '/#pricing' }
]

const LEGAL = [
  { title: 'Disclaimer', href: '/disclaimer' },
  { title: 'AI Disclosure', href: '/ai-disclosure' },
  { title: 'Acceptable Use', href: '/acceptable-use' },
  { title: 'Contact', href: '/contact' }
]

const BOTTOM_LINKS = [
  { title: 'Terms', href: '/terms' },
  { title: 'Privacy', href: '/privacy' },
  { title: 'Disclaimer', href: '/disclaimer' },
  { title: 'AI Disclosure', href: '/ai-disclosure' }
]

function FooterMenu({ title, items }: { title: string; items: { title: string; href: string }[] }) {
  return (
    <div>
      <div className="mb-6 text-description-2 text-white max-md:mb-2">{title}</div>
      <div className="flex flex-col items-start gap-4.5 max-md:gap-2.25">
        {items.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="text-description-3 text-description transition-colors hover:text-white"
          >
            {item.title}
          </Link>
        ))}
      </div>
    </div>
  )
}

// Legacy named exports retained so existing imports (if any) keep working.
export function FooterText({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'px-2 text-center text-description-3 text-description',
        className
      )}
      {...props}
    >
      CheckRay provides informational risk analysis only, not legal,
      financial, or medical advice. Ray can be wrong. Verify before acting.
    </p>
  )
}

export function FooterLegal({ className }: { className?: string }) {
  return (
    <nav
      className={cn(
        'flex flex-wrap justify-center gap-x-4 gap-y-1 text-center text-description-3 text-description',
        className
      )}
      aria-label="Legal links"
    >
      {BOTTOM_LINKS.map(link => (
        <Link
          key={link.href}
          href={link.href}
          className="hover:text-white"
        >
          {link.title}
        </Link>
      ))}
    </nav>
  )
}

export function Footer({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        'pt-15 pb-6 bg-deep/80 backdrop-blur-[1rem] border-t border-white/5 max-md:pt-10 max-md:pb-3',
        className
      )}
    >
      <div className="center max-md:!px-7.5">
        <div className="flex justify-between gap-10 max-md:flex-col max-md:gap-7">
          {/* Brand column */}
          <div className="max-w-64 max-lg:max-w-44 max-md:max-w-full">
            <Link
              href="/"
              aria-label="CheckRay home"
              className="mb-7.5 inline-flex items-center max-md:mb-2.5"
            >
              <Image
                src="/checkraylogo.png"
                alt="CheckRay"
                width={1200}
                height={300}
                className="h-7 w-auto select-none"
              />
            </Link>
            <div className="text-description-3 text-description">
              CheckRay is a personal risk-check assistant for suspicious
              texts, emails, job offers, links, bills, and listings. Ray gives
              you a risk score, common red flags, and what to do next.
              Informational only. Ray can be wrong. Verify through official
              channels before acting.
            </div>
          </div>

          <FooterMenu title="Sections" items={SECTIONS} />
          <FooterMenu title="Legal" items={LEGAL} />

          {/* Channels column (in place of newsletter to avoid fake form) */}
          <div className="shrink-0 w-70 max-lg:w-56 max-md:w-full">
            <div className="mb-6 text-description-2 text-white max-md:mb-2.5">
              Channels
            </div>
            <div className="mb-3 text-description-3 text-description">
              Use the channel that feels easiest. Ray meets you where the
              message arrived.
            </div>
            <ul className="flex flex-col gap-2 text-description-3 text-description">
              <li>
                <span className="text-white">Text</span> · save to home screen
              </li>
              <li>
                <span className="text-white">Email</span> · forward suspicious mail
              </li>
              <li>
                <span className="text-white">Web</span> · paste a link or upload
              </li>
            </ul>
          </div>
        </div>

        <div className="flex justify-between items-center mt-11 py-5 border-t border-line max-md:flex-col max-md:items-start">
          <div className="text-description-3 text-description max-md:mb-2">
            © {CURRENT_YEAR} CheckRay. All rights reserved.
          </div>
          <div className="flex items-center flex-wrap max-md:flex-col max-md:items-start max-md:gap-2">
            {BOTTOM_LINKS.map((link, i) => (
              <React.Fragment key={link.href}>
                <Link
                  className="text-description-3 text-description transition-colors hover:text-white"
                  href={link.href}
                >
                  {link.title}
                </Link>
                {i < BOTTOM_LINKS.length - 1 && (
                  <div className="w-0.25 h-4 mx-6 bg-white/20 max-md:hidden" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
