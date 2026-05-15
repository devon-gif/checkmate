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
      <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
        <strong>Important:</strong> CheckMate is not a law firm and does not provide legal,
        financial, or medical advice. These Terms are not a substitute for professional legal
        counsel.
      </div>

      <LegalSection title="1. About CheckMate">
        <p>
          CheckMate (&ldquo;CheckMate,&rdquo; &ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;)
          is a consumer risk-awareness service. We use AI and automated checks to help you identify
          possible red flags in suspicious texts, emails, bills, fees, collection notices, job
          listings, links, and other documents (&ldquo;Items&rdquo;).
        </p>
        <p className="font-semibold">
          CheckMate is NOT a law firm. CheckMate does NOT provide legal, financial, medical, or any
          other type of professional advice.
        </p>
        <p>
          AI and automated analysis can be wrong. Results are probabilistic and informational only.
          You are responsible for your own decisions. Always verify with official sources and
          qualified professionals.
        </p>
      </LegalSection>

      <LegalSection title="2. Eligibility">
        <p>
          You must be at least 18 years old (or the age of majority in your jurisdiction) to use
          CheckMate.
        </p>
      </LegalSection>

      <LegalSection title="3. Your Account">
        <p>
          You are responsible for maintaining the security of your account credentials. Notify us
          immediately via our{' '}
          <Link href="/contact" className="underline underline-offset-4">
            contact page
          </Link>{' '}
          if you suspect unauthorized access.
        </p>
      </LegalSection>

      <LegalSection title="4. Acceptable Use">
        <p>
          You agree to use CheckMate only for lawful purposes in accordance with our{' '}
          <Link href="/acceptable-use" className="underline underline-offset-4">
            Acceptable Use Policy
          </Link>
          , incorporated here by reference.
        </p>
      </LegalSection>

      <LegalSection title="5. User Content & License">
        <p>
          When you submit Items to CheckMate, you grant us a limited, non-exclusive, royalty-free
          license to process, store, transmit, and analyze that content solely to deliver our
          service to you. We do not sell your submitted content or use it to train third-party AI
          models without your explicit consent. You retain all ownership rights.
        </p>
      </LegalSection>

      <LegalSection title="6. Subscriptions, Billing & Refunds">
        <p>
          CheckMate may offer free and paid tiers. Paid subscriptions are billed on a recurring
          basis as specified at checkout. You may cancel at any time from account settings;
          cancellation takes effect at end of the current billing period.
        </p>
        <LawyerNote>
          [LAWYER REVIEW: refund policy — specify pro-rated refund, cancellation, and chargeback
          dispute policies in detail.]
        </LawyerNote>
      </LegalSection>

      <LegalSection title="7. Disclaimers & No Guarantees">
        <p>
          THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTIES OF ANY KIND. WE DO NOT
          WARRANT THAT ANY RESULT IS ACCURATE, COMPLETE, OR RELIABLE. CheckMate does NOT guarantee
          that any message, link, job, bill, fee, or document is safe, legitimate, fraudulent,
          enforceable, payable, or otherwise.
        </p>
        <p className="font-semibold">
          IN EMERGENCIES, IMMINENT THREATS, IDENTITY THEFT, FRAUD LOSS, LEGAL DEADLINES, MEDICAL
          ISSUES, OR FINANCIAL HARM — CONTACT THE RELEVANT PROFESSIONAL OR AUTHORITY IMMEDIATELY.
        </p>
      </LegalSection>

      <LegalSection title="8. Limitation of Liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, CHECKMATE SHALL NOT BE LIABLE FOR ANY INDIRECT,
          INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. OUR TOTAL LIABILITY SHALL NOT
          EXCEED THE GREATER OF (A) AMOUNTS YOU PAID US IN THE PRIOR 12 MONTHS, OR (B) $100 USD.
        </p>
        <LawyerNote>
          [LAWYER REVIEW: confirm liability cap and jurisdictional carve-outs.]
        </LawyerNote>
      </LegalSection>

      <LegalSection title="9. Indemnification">
        <p>
          You agree to defend, indemnify, and hold harmless CheckMate and its affiliates, officers,
          directors, and employees from claims arising out of your violation of these Terms, your
          submitted content, or your unauthorized use of the service.
        </p>
      </LegalSection>

      <LegalSection title="10. Dispute Resolution">
        <LawyerNote>
          [LAWYER REVIEW: arbitration clause, class action waiver, governing law, and venue.]
        </LawyerNote>
        <p>
          These Terms are governed by the laws of the applicable jurisdiction without regard to
          conflict of law principles.
        </p>
      </LegalSection>

      <LegalSection title="11. Account Termination">
        <p>
          We may suspend or terminate your account for violations of these Terms. You may delete
          your account at any time. Upon termination, your data is handled per our{' '}
          <Link href="/privacy" className="underline underline-offset-4">
            Privacy Policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="12. Changes to These Terms">
        <p>
          We may update these Terms from time to time. We will prompt you to review and accept any
          material updates before continuing to use the service.
        </p>
      </LegalSection>

      <LegalSection title="13. Contact">
        <p>
          Questions about these Terms? Visit our{' '}
          <Link href="/contact" className="underline underline-offset-4">
            contact page
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  )
}
