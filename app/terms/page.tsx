import { Metadata } from 'next'
import Link from 'next/link'
import { TERMS_VERSION } from '@/lib/legalCopy'
import { LegalPage, LegalSection, LawyerNote } from '@/components/legal-page-layout'

export const metadata: Metadata = {
  title: 'Terms of Service – CheckMate',
  description: 'CheckMate Terms of Service',
}

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" version={TERMS_VERSION} effectiveDate="May 15, 2026">
      <Section title="1. About CheckMate">
        <p>
          CheckMate (&ldquo;CheckMate,&rdquo; &ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is a
          consumer risk-awareness service. We use AI and automated checks to help you identify possible red
          flags in suspicious texts, emails, bills, fees, collection notices, job listings, links, and
          other documents (&ldquo;Items&rdquo;).
        </p>
        <p className="mt-3 font-semibold">
          CheckMate is NOT a law firm. CheckMate does NOT provide legal, financial, medical, or any other
          type of professional advice. Nothing on this platform constitutes professional advice of any kind.
        </p>
        <p className="mt-3">
          AI and automated analysis can be wrong. Results are probabilistic and informational only. You are
          responsible for your own decisions. Always verify important issues with official sources and
          qualified professionals.
        </p>
      </Section>

      <Section title="2. Eligibility">
        <p>
          You must be at least 18 years old (or the age of majority in your jurisdiction) to use CheckMate.
          By creating an account, you represent and warrant that you meet this requirement.
        </p>
      </Section>

      <Section title="3. Your Account">
        <p>
          You are responsible for maintaining the security of your account credentials. You agree to notify
          us immediately at{' '}
          <Link href="/contact" className="underline underline-offset-4">
            contact
          </Link>{' '}
          if you suspect unauthorized access. We are not liable for any loss resulting from unauthorized
          use of your account.
        </p>
      </Section>

      <Section title="4. Acceptable Use">
        <p>
          You agree to use CheckMate only for lawful purposes and in accordance with our{' '}
          <Link href="/acceptable-use" className="underline underline-offset-4">
            Acceptable Use Policy
          </Link>
          , which is incorporated here by reference. Prohibited uses include, but are not limited to:
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1">
          <li>Submitting content to facilitate fraud, harassment, or harm to others</li>
          <li>Reverse-engineering, scraping, or systematically extracting data from the service</li>
          <li>Attempting to circumvent security measures or rate limits</li>
          <li>Using the service to train competing AI models without written permission</li>
          <li>Submitting false, misleading, or deceptive information</li>
          <li>Violating any applicable law or regulation</li>
        </ul>
      </Section>

      <Section title="5. User Content & License">
        <p>
          When you submit Items to CheckMate (messages, images, documents, links, etc.), you grant us a
          limited, non-exclusive, royalty-free license to process, store, transmit, and analyze that content
          solely for the purpose of delivering our service to you. We do not sell your submitted content or
          use it to train AI models for third parties without your explicit consent.
        </p>
        <p className="mt-3">
          You retain all ownership rights to your submitted content. You represent that you have the right
          to submit the content and that doing so does not violate any applicable law or third-party rights.
        </p>
      </Section>

      <Section title="6. Subscriptions, Billing & Refunds">
        <p>
          CheckMate may offer free and paid subscription tiers. Paid subscriptions are billed on a
          recurring basis (monthly or annually) as specified at checkout. All fees are charged in advance
          and are non-refundable except as required by applicable law or as described in our refund policy.
        </p>
        <p className="mt-3 italic text-muted-foreground">
          [LAWYER REVIEW: refund policy — specify any pro-rated refund, cancellation, and chargeback
          dispute policies in detail.]
        </p>
        <p className="mt-3">
          You may cancel your subscription at any time from your account settings. Cancellation takes
          effect at the end of the current billing period. We reserve the right to change pricing with
          reasonable notice.
        </p>
      </Section>

      <Section title="7. Disclaimers & No Guarantees">
        <p>
          THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND,
          EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE ERROR-FREE, UNINTERRUPTED, OR
          THAT ANY RESULT IS ACCURATE, COMPLETE, OR RELIABLE.
        </p>
        <p className="mt-3">
          CheckMate does NOT guarantee that any message, link, job, bill, fee, or document is safe,
          unsafe, legitimate, fraudulent, enforceable, unenforceable, accurate, inaccurate, payable, or
          not payable. Risk scores and red flags are probabilistic signals, not definitive judgments.
        </p>
        <p className="mt-3">
          IN EMERGENCIES, IMMINENT THREATS, IDENTITY THEFT, FRAUD LOSS, LEGAL DEADLINES, MEDICAL ISSUES,
          OR FINANCIAL HARM — CONTACT THE RELEVANT PROFESSIONAL, INSTITUTION, OR AUTHORITY IMMEDIATELY.
          DO NOT RELY ON CHECKMATE AS YOUR ONLY SOURCE OF TRUTH.
        </p>
      </Section>

      <Section title="8. Limitation of Liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL CHECKMATE, ITS OFFICERS,
          DIRECTORS, EMPLOYEES, AGENTS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
          CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS,
          DATA, GOODWILL, BUSINESS INTERRUPTION, OR FINANCIAL LOSS, ARISING OUT OF OR IN CONNECTION WITH
          YOUR USE OF (OR INABILITY TO USE) THE SERVICE.
        </p>
        <p className="mt-3">
          OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING UNDER THESE TERMS SHALL NOT EXCEED THE GREATER
          OF (A) THE AMOUNT YOU PAID TO US IN THE TWELVE MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED
          U.S. DOLLARS ($100).
        </p>
        <p className="mt-3 italic text-muted-foreground">
          [LAWYER REVIEW: confirm liability cap and jurisdictional carve-outs.]
        </p>
      </Section>

      <Section title="9. Indemnification">
        <p>
          You agree to defend, indemnify, and hold harmless CheckMate and its affiliates, officers,
          directors, employees, and agents from and against any claims, liabilities, damages, judgments,
          awards, losses, costs, expenses, or fees (including reasonable attorneys&rsquo; fees) arising out
          of or relating to your violation of these Terms, your submitted content, or your use of the
          service in a manner not authorized herein.
        </p>
      </Section>

      <Section title="10. Dispute Resolution">
        <p className="italic text-muted-foreground">
          [LAWYER REVIEW: arbitration clause, class action waiver, and governing law — specify
          jurisdiction, venue, and whether binding arbitration applies.]
        </p>
        <p className="mt-3">
          These Terms are governed by the laws of the applicable jurisdiction without regard to conflict of
          law principles. Any disputes not resolved informally will be brought exclusively in the courts
          designated by governing law.
        </p>
      </Section>

      <Section title="11. Account Termination">
        <p>
          We reserve the right to suspend or terminate your account at any time, with or without notice,
          for violations of these Terms, our Acceptable Use Policy, or for any other reason at our
          discretion. You may delete your account at any time from your account settings. Upon termination,
          your data is handled as described in our{' '}
          <Link href="/privacy" className="underline underline-offset-4">
            Privacy Policy
          </Link>
          .
        </p>
      </Section>

      <Section title="12. Changes to These Terms">
        <p>
          We may update these Terms from time to time. When we do, we will revise the version number and
          effective date above, and we will prompt you to review and accept the updated terms before
          continuing to use the service. Continued use after acceptance constitutes agreement to the
          updated terms.
        </p>
      </Section>

      <Section title="13. Contact">
        <p>
          Questions about these Terms? Reach us at our{' '}
          <Link href="/contact" className="underline underline-offset-4">
            contact page
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  )
}

// ---------------------------------------------------------------------------
// Shared layout helpers (local to legal pages)
// ---------------------------------------------------------------------------

function LegalPage({
  title,
  version,
  effectiveDate,
  children,
}: {
  title: string
  version: string
  effectiveDate: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <div className="mb-8 border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Version {version} &middot; Effective {effectiveDate}
        </p>
        <p className="mt-4 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
          <strong>Important:</strong> CheckMate is not a law firm and does not provide legal, financial, or
          medical advice. This document is not a substitute for professional legal counsel. We recommend
          having an attorney review all legal documents that affect your rights and obligations.
        </p>
      </div>
      <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-p:text-muted-foreground prose-li:text-muted-foreground">
        {children}
      </div>
      <div className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        <LegalFooterLinks />
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-foreground">{title}</h2>
      <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}

function LegalFooterLinks() {
  const links = [
    { href: '/terms', label: 'Terms' },
    { href: '/privacy', label: 'Privacy' },
    { href: '/disclaimer', label: 'Disclaimer' },
    { href: '/ai-disclosure', label: 'AI Disclosure' },
    { href: '/acceptable-use', label: 'Acceptable Use' },
    { href: '/contact', label: 'Contact' },
  ]
  return (
    <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1">
      {links.map(l => (
        <Link key={l.href} href={l.href} className="hover:text-foreground hover:underline">
          {l.label}
        </Link>
      ))}
    </nav>
  )
}
