import { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, LegalSection } from '@/components/legal-page-layout'

export const metadata: Metadata = {
  title: 'Contact – CheckMate',
  description: 'Contact the CheckMate team'
}

export default function ContactPage() {
  return (
    <LegalPage title="Contact Us" version="1.0.0" effectiveDate="May 15, 2026">
      <LegalSection title="General Inquiries">
        <p>
          For general questions about CheckMate, feedback, or feature requests,
          please email us at:
        </p>
        <p className="font-medium text-foreground">
          <a
            href="mailto:hello@checkmate.app"
            className="underline underline-offset-4 hover:text-primary"
          >
            hello@checkmate.app
          </a>
        </p>
      </LegalSection>

      <LegalSection title="Privacy & Data Requests">
        <p>
          To exercise your privacy rights (access, correction, deletion,
          portability), or to submit a privacy-related concern:
        </p>
        <p className="font-medium text-foreground">
          <a
            href="mailto:privacy@checkmate.app"
            className="underline underline-offset-4 hover:text-primary"
          >
            privacy@checkmate.app
          </a>
        </p>
        <p>
          Please include your account email address and a clear description of
          your request. We will respond within the timeframe required by
          applicable law.
        </p>
      </LegalSection>

      <LegalSection title="Legal & Abuse Reports">
        <p>
          For legal notices, abuse reports, law enforcement inquiries, or terms
          violations:
        </p>
        <p className="font-medium text-foreground">
          <a
            href="mailto:legal@checkmate.app"
            className="underline underline-offset-4 hover:text-primary"
          >
            legal@checkmate.app
          </a>
        </p>
      </LegalSection>

      <LegalSection title="Billing & Account Support">
        <p>For billing issues, subscription questions, or account problems:</p>
        <p className="font-medium text-foreground">
          <a
            href="mailto:support@checkmate.app"
            className="underline underline-offset-4 hover:text-primary"
          >
            support@checkmate.app
          </a>
        </p>
      </LegalSection>

      <LegalSection title="Response Times">
        <p>
          We aim to respond to all inquiries within 2–5 business days. Privacy
          and legal requests may take longer depending on complexity and
          applicable legal requirements.
        </p>
        <p className="font-medium">
          For emergencies, imminent threats, identity theft, or active fraud —
          do NOT wait for our response. Contact your bank, the FTC
          (reportfraud.ftc.gov), or law enforcement immediately.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
