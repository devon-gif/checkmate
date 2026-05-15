import { Metadata } from 'next'
import Link from 'next/link'
import { PRIVACY_VERSION } from '@/lib/legalCopy'
import {
  LegalPage,
  LegalSection,
  LawyerNote
} from '@/components/legal-page-layout'

export const metadata: Metadata = {
  title: 'Privacy Policy – CheckRay',
  description: 'CheckRay Privacy Policy'
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      version={PRIVACY_VERSION}
      effectiveDate="May 15, 2026"
    >
      <LegalSection title="1. Overview">
        <p>
          This Privacy Policy explains how CheckRay collects, uses, stores, and
          shares information about you when you use our services. By using
          CheckRay, you agree to this policy.
        </p>
        <LawyerNote>
          [LAWYER REVIEW: privacy compliance including CCPA, CPRA, Virginia
          CDPA, Colorado CPA, and other applicable U.S. and international
          regulations.]
        </LawyerNote>
      </LegalSection>

      <LegalSection title="2. Information We Collect">
        <ul className="list-inside list-disc space-y-2">
          <li>
            <strong>Account information:</strong> email address, hashed
            password, and any profile details you provide.
          </li>
          <li>
            <strong>Submitted content:</strong> messages, images, files, links,
            and Items you submit for analysis.
          </li>
          <li>
            <strong>Usage data:</strong> pages visited, features used,
            timestamps, and interaction data.
          </li>
          <li>
            <strong>Device & technical data:</strong> IP address, browser type,
            OS, and user-agent string.
          </li>
          <li>
            <strong>Legal acceptance records:</strong> which versions of our
            Terms, Privacy Policy, and AI Disclosure you accepted, and when.
          </li>
          <li>
            <strong>Communications:</strong> messages you send us via email or
            the in-app contact form.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. How We Use Your Information">
        <ul className="list-inside list-disc space-y-2">
          <li>To provide, operate, and improve the CheckRay service.</li>
          <li>To analyze submitted Items and generate risk assessments.</li>
          <li>To authenticate you and keep your account secure.</li>
          <li>
            To send service-related communications (confirmations, security
            alerts, terms updates).
          </li>
          <li>To comply with legal obligations and enforce our Terms.</li>
          <li>To generate aggregate, anonymized analytics.</li>
        </ul>
        <p>
          We do <strong>not</strong> sell your personal information. We do{' '}
          <strong>not</strong> use your submitted content to train third-party
          AI models without explicit consent.
        </p>
      </LegalSection>

      <LegalSection title="4. SMS / Email Communications">
        <p>
          If you use SMS or email features (e.g., forwarding suspicious messages
          to CheckRay), you consent to receive service-related messages from
          us. Standard messaging rates may apply.
        </p>
        <p className="font-medium">
          Important: SMS, MMS, and email may not be fully secure in transit. Do
          not send full Social Security numbers, full bank account numbers, full
          card numbers, passwords, verification codes, medical records, or other
          highly sensitive data via SMS/email to CheckRay unless absolutely
          necessary.
        </p>
        <LawyerNote>
          [LAWYER REVIEW: SMS consent and TCPA compliance — confirm opt-in,
          opt-out, and record-keeping requirements.]
        </LawyerNote>
      </LegalSection>

      <LegalSection title="5. Data Sharing">
        <ul className="list-inside list-disc space-y-2">
          <li>
            <strong>Service providers:</strong> infrastructure, hosting,
            analytics, and payment processors under data processing agreements.
          </li>
          <li>
            <strong>AI model providers:</strong> submitted content is sent to AI
            providers (e.g., OpenAI) to generate analysis, subject to their
            policies.
          </li>
          <li>
            <strong>Law enforcement / legal:</strong> if required by law, court
            order, or to protect safety.
          </li>
          <li>
            <strong>Business transfers:</strong> in the event of a merger,
            acquisition, or asset sale.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Data Retention">
        <p>
          We retain your account data and submitted content for as long as your
          account is active or as needed to provide the service.
        </p>
        <LawyerNote>
          [LAWYER REVIEW: data retention period — specify exact retention
          schedules, backup retention, and deletion timelines for each data
          category.]
        </LawyerNote>
      </LegalSection>

      <LegalSection title="7. Security">
        <p>
          We use industry-standard technical and organizational measures
          including encryption at rest and in transit, access controls, and
          regular security reviews. No system is completely secure, and we
          cannot guarantee absolute security.
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies & Tracking">
        <p>
          We use essential cookies for authentication and service functionality.
          We may use analytics tools that set cookies. You can control
          non-essential cookies through your browser settings.
        </p>
      </LegalSection>

      <LegalSection title="9. Children's Privacy">
        <p>
          CheckRay is not directed to children under 13. We do not knowingly
          collect personal information from children. If you believe a child has
          provided us personal data, please{' '}
          <Link href="/contact" className="underline underline-offset-4">
            contact us
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="10. Your Rights">
        <p>
          Depending on your jurisdiction, you may have rights to access,
          correct, delete, or port your personal data. Visit your account
          settings or{' '}
          <Link href="/contact" className="underline underline-offset-4">
            contact us
          </Link>{' '}
          to exercise these rights.
        </p>
        <LawyerNote>
          [LAWYER REVIEW: confirm applicable state/country-specific rights and
          response timelines.]
        </LawyerNote>
      </LegalSection>

      <LegalSection title="11. Changes to This Policy">
        <p>
          We may update this Privacy Policy and will notify you of material
          changes by updating the version number and prompting you to accept the
          updated policy.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact">
        <p>
          Privacy questions or data requests? Use our{' '}
          <Link href="/contact" className="underline underline-offset-4">
            contact page
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  )
}
