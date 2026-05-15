import { Metadata } from 'next'
import Link from 'next/link'
import { PRIVACY_VERSION } from '@/lib/legalCopy'

export const metadata: Metadata = {
  title: 'Privacy Policy – CheckMate',
  description: 'CheckMate Privacy Policy',
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" version={PRIVACY_VERSION} effectiveDate="May 15, 2026">
      <Section title="1. Overview">
        <p>
          This Privacy Policy explains how CheckMate collects, uses, stores, and shares information about
          you when you use our services. By using CheckMate, you agree to this policy.
        </p>
        <p className="mt-3 italic text-muted-foreground">
          [LAWYER REVIEW: privacy compliance including state privacy laws — CCPA, CPRA, Virginia CDPA,
          Colorado CPA, and other applicable U.S. and international regulations.]
        </p>
      </Section>

      <Section title="2. Information We Collect">
        <p>We collect the following categories of information:</p>
        <ul className="mt-3 list-inside list-disc space-y-2">
          <li>
            <strong>Account information:</strong> email address, password (hashed), and any profile
            details you provide.
          </li>
          <li>
            <strong>Submitted content:</strong> messages, images, files, links, and other Items you
            submit for analysis.
          </li>
          <li>
            <strong>Usage data:</strong> pages visited, features used, timestamps, and interaction data.
          </li>
          <li>
            <strong>Device &amp; technical data:</strong> IP address, browser type, operating system,
            and user-agent string.
          </li>
          <li>
            <strong>Legal acceptance records:</strong> which versions of our Terms, Privacy Policy,
            and AI Disclosure you accepted, and when.
          </li>
          <li>
            <strong>Communication data:</strong> if you contact us by email or through the app,
            we retain those communications.
          </li>
        </ul>
      </Section>

      <Section title="3. How We Use Your Information">
        <ul className="list-inside list-disc space-y-2">
          <li>To provide, operate, and improve the CheckMate service.</li>
          <li>To analyze submitted Items and generate risk assessments.</li>
          <li>To authenticate you and keep your account secure.</li>
          <li>To send service-related communications (account confirmations, security alerts,
            terms updates). By using the service, you consent to receive these messages.</li>
          <li>To comply with legal obligations and enforce our Terms.</li>
          <li>To generate aggregate, anonymized analytics (no individual user is identifiable).</li>
        </ul>
        <p className="mt-3">
          We do <strong>not</strong> sell your personal information to third parties. We do{' '}
          <strong>not</strong> use your submitted content to train third-party AI models without your
          explicit consent.
        </p>
      </Section>

      <Section title="4. SMS / Email Communications">
        <p>
          If you use SMS or email features (e.g., forwarding suspicious messages to CheckMate), you
          consent to receive service-related SMS and email messages from us in connection with that
          feature. Standard messaging rates may apply.
        </p>
        <p className="mt-3 font-medium">
          Important: SMS, MMS, and email transmissions may not be fully secure in transit. Do not send
          full Social Security numbers, full bank account numbers, full card numbers, passwords,
          verification codes, medical records, or other highly sensitive personal data via SMS/email to
          CheckMate unless absolutely necessary. Where possible, use the secure in-app upload feature
          instead.
        </p>
        <p className="mt-3 italic text-muted-foreground">
          [LAWYER REVIEW: SMS consent and TCPA compliance — confirm opt-in, opt-out, and
          record-keeping requirements.]
        </p>
      </Section>

      <Section title="5. Data Sharing">
        <p>We may share information with:</p>
        <ul className="mt-3 list-inside list-disc space-y-2">
          <li>
            <strong>Service providers:</strong> infrastructure, hosting, analytics, and payment
            processors acting on our behalf under data processing agreements.
          </li>
          <li>
            <strong>AI model providers:</strong> submitted content is sent to AI providers (e.g.,
            OpenAI) to generate analysis results, subject to their privacy policies.
          </li>
          <li>
            <strong>Law enforcement / legal:</strong> if required by law, court order, or to protect
            safety.
          </li>
          <li>
            <strong>Business transfers:</strong> in the event of a merger, acquisition, or asset sale,
            your information may be transferred as part of that transaction.
          </li>
        </ul>
      </Section>

      <Section title="6. Data Retention">
        <p>
          We retain your account data and submitted content for as long as your account is active or as
          needed to provide the service. You may delete your account at any time from your account
          settings, which will trigger deletion of your personal data subject to legal holds.
        </p>
        <p className="mt-3 italic text-muted-foreground">
          [LAWYER REVIEW: data retention period — specify exact retention schedules for each
          data category, backup retention, and deletion timelines.]
        </p>
      </Section>

      <Section title="7. Security">
        <p>
          We use industry-standard technical and organizational measures to protect your data, including
          encryption at rest and in transit, access controls, and regular security reviews. However, no
          system is completely secure, and we cannot guarantee absolute security.
        </p>
      </Section>

      <Section title="8. Cookies & Tracking">
        <p>
          We use essential cookies required to authenticate your session and maintain service
          functionality. We may use analytics tools that set cookies to help us understand how the
          service is used. You can control non-essential cookies through your browser settings.
        </p>
      </Section>

      <Section title="9. Children's Privacy">
        <p>
          CheckMate is not directed to children under 13. We do not knowingly collect personal
          information from children. If you believe a child has provided us personal information,
          please{' '}
          <Link href="/contact" className="underline underline-offset-4">
            contact us
          </Link>{' '}
          immediately.
        </p>
      </Section>

      <Section title="10. Your Rights">
        <p>
          Depending on your jurisdiction, you may have rights to access, correct, delete, or port your
          personal data. To exercise these rights, visit your account settings or{' '}
          <Link href="/contact" className="underline underline-offset-4">
            contact us
          </Link>
          . We will respond within the timeframe required by applicable law.
        </p>
        <p className="mt-3 italic text-muted-foreground">
          [LAWYER REVIEW: confirm applicable state/country-specific rights and response timelines.]
        </p>
      </Section>

      <Section title="11. Changes to This Policy">
        <p>
          We may update this Privacy Policy and will notify you of material changes by updating the
          version number and prompting you to review and accept the updated policy in the app.
        </p>
      </Section>

      <Section title="12. Contact">
        <p>
          Privacy questions or requests? Please use our{' '}
          <Link href="/contact" className="underline underline-offset-4">
            contact page
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  )
}

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
