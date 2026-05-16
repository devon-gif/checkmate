import { Metadata } from 'next'
import Link from 'next/link'
import { ACCEPTABLE_USE_VERSION } from '@/lib/legalCopy'
import { LegalPage, LegalSection } from '@/components/legal-page-layout'

export const metadata: Metadata = {
  title: 'Acceptable Use Policy – CheckRay',
  description: 'CheckRay Acceptable Use Policy'
}

export default function AcceptableUsePage() {
  return (
    <LegalPage
      title="Acceptable Use Policy"
      version={ACCEPTABLE_USE_VERSION}
      effectiveDate="May 15, 2026"
    >
      <LegalSection title="Overview">
        <p>
          This Acceptable Use Policy (&ldquo;AUP&rdquo;) describes what you may
          and may not do when using CheckRay. By using our service, you agree
          to this policy. Violations may result in suspension or termination of
          your account.
        </p>
      </LegalSection>

      <LegalSection title="Permitted Uses">
        <p>CheckRay is designed for personal, non-commercial use to:</p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            Submit suspicious messages, emails, bills, links, job listings, or
            documents for risk analysis
          </li>
          <li>Review AI-generated risk assessments and suggested next steps</li>
          <li>
            Organize and track cases of potential fraud, scams, or suspicious
            activity
          </li>
          <li>
            Share case information with people you trust (using share links)
          </li>
        </ul>
        <p>
          Commercial or enterprise use requires a separate written agreement
          with CheckRay.
        </p>
      </LegalSection>

      <LegalSection title="Prohibited Uses">
        <p>You may NOT use CheckRay to:</p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            Submit content on behalf of others without their knowledge or
            consent
          </li>
          <li>
            Submit, store, or transmit content that is illegal, defamatory,
            threatening, harassing, or abusive
          </li>
          <li>
            Submit content containing full Social Security numbers, full
            financial account numbers, full payment card numbers, medical
            records, or full identity documents belonging to other individuals
            without their consent
          </li>
          <li>
            Facilitate, plan, or assist in any fraud, scam, or criminal activity
          </li>
          <li>
            Attempt to probe, scan, or test the vulnerability of CheckRay
            systems
          </li>
          <li>
            Use automated bots, scrapers, or scripts to access the service at
            scale without written permission
          </li>
          <li>
            Reverse-engineer, decompile, or otherwise attempt to extract source
            code or underlying models
          </li>
          <li>
            Use outputs or data from CheckRay to train competing AI models or
            services without written consent
          </li>
          <li>Impersonate another person or entity</li>
          <li>
            Circumvent any authentication, rate limit, or security measure
          </li>
          <li>Submit false or misleading content to manipulate AI results</li>
          <li>Violate any applicable law or regulation</li>
        </ul>
      </LegalSection>

      <LegalSection title="Sensitive Data Caution">
        <p>
          While CheckRay uses encryption in transit and at rest, no system is
          completely secure. We strongly advise:
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            Do not submit full Social Security numbers (use partial numbers if
            needed for context)
          </li>
          <li>Do not submit full bank account or routing numbers</li>
          <li>
            Do not submit full payment card numbers (use last 4 digits for
            context)
          </li>
          <li>Do not submit passwords or authentication codes</li>
          <li>
            Do not submit medical records or protected health information unless
            absolutely necessary for your analysis
          </li>
          <li>
            Redact sensitive fields before uploading documents where possible
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Reporting Violations">
        <p>
          If you encounter content or behavior on CheckRay that violates this
          AUP, please{' '}
          <Link href="/contact" className="underline underline-offset-4">
            contact us
          </Link>{' '}
          immediately.
        </p>
      </LegalSection>

      <LegalSection title="Enforcement">
        <p>
          Violations of this AUP may result in warning, temporary suspension, or
          permanent termination of your account, at our sole discretion, with or
          without notice. We reserve the right to cooperate with law enforcement
          regarding illegal use of our service.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
