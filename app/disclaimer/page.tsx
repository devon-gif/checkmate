import { Metadata } from 'next'
import Link from 'next/link'
import {
  LegalPage,
  LegalSection,
  LawyerNote
} from '@/components/legal-page-layout'

export const metadata: Metadata = {
  title: 'General Disclaimer – CheckRay',
  description: 'CheckRay General Disclaimer'
}

export default function DisclaimerPage() {
  return (
    <LegalPage
      title="General Disclaimer"
      version="1.0.0"
      effectiveDate="May 15, 2026"
    >
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        <strong>Please read this disclaimer carefully.</strong> By using
        CheckRay, you acknowledge and agree to all statements on this page.
      </div>

      <LegalSection title="Not a Law Firm. Not Professional Advice.">
        <p>
          CheckRay is not a law firm, financial institution, medical provider,
          or any type of licensed professional services firm. Nothing on this
          platform, including AI-generated analysis, risk scores, red flags,
          suggested next steps, or reply language, constitutes legal advice,
          financial advice, investment advice, medical advice, or any other form
          of professional advice.
        </p>
        <p>
          CheckRay does not create an attorney-client relationship, financial
          advisor relationship, doctor-patient relationship, or any other
          professional relationship of any kind.
        </p>
        <p>
          If you need legal, financial, medical, or other professional help,
          please consult a qualified professional. Do not rely on CheckRay as a
          substitute.
        </p>
      </LegalSection>

      <LegalSection title="No Guarantee of Accuracy">
        <p>
          AI and automated analysis can be wrong. CheckRay does not guarantee
          that any result, risk score, red flag, or suggested action is
          accurate, complete, current, or appropriate for your specific
          situation.
        </p>
        <p>
          CheckRay does NOT guarantee that any message, link, job listing,
          bill, fee, collection notice, rental listing, or other document is:
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>Safe or unsafe</li>
          <li>Legitimate or fraudulent</li>
          <li>Enforceable or unenforceable</li>
          <li>Accurate or inaccurate</li>
          <li>Payable or not payable</li>
          <li>From a real person or organization</li>
        </ul>
      </LegalSection>

      <LegalSection title="User Responsibility">
        <p>
          You are solely responsible for your own decisions and actions.
          CheckRay provides informational starting points. You must
          independently verify important information with official sources,
          qualified professionals, employers, banks, insurers, landlords,
          government agencies, attorneys, doctors, or other appropriate experts
          before acting.
        </p>
        <p>Do not use CheckRay as your only source of truth.</p>
      </LegalSection>

      <LegalSection title="Emergency & High-Stakes Situations">
        <p className="font-semibold">
          In emergencies, imminent threats, identity theft, fraud loss, legal
          deadlines, medical issues, or financial harm: contact the relevant
          professional, institution, or authority immediately. Do not wait for
          AI analysis.
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>Medical emergency: call 911 or your local emergency number</li>
          <li>Immediate physical danger: call 911</li>
          <li>
            Identity theft or financial fraud: contact your bank and the FTC
            immediately
          </li>
          <li>
            Legal deadlines (lawsuits, eviction notices, debt collection):
            consult an attorney now
          </li>
          <li>
            Suspected phishing / account compromise: change your passwords
            immediately
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Safer Language Policy">
        <p>
          CheckRay uses probabilistic language throughout the app:
          &ldquo;possible red flags,&rdquo; &ldquo;risk signals,&rdquo;
          &ldquo;appears suspicious,&rdquo; &ldquo;may be risky,&rdquo; and
          &ldquo;recommended next steps.&rdquo; This language is intentional. It
          reflects the probabilistic nature of AI analysis and is not a
          definitive statement of fact.
        </p>
      </LegalSection>

      <LegalSection title="Limitation of Liability">
        <p>
          To the fullest extent permitted by law, CheckRay and its affiliates,
          officers, directors, and employees shall not be liable for any loss,
          damage, or harm of any kind arising from your use of the service or
          reliance on any result, including but not limited to financial loss,
          identity theft, legal consequences, or physical harm.
        </p>
        <LawyerNote>
          [LAWYER REVIEW: confirm limitation of liability language and
          jurisdictional enforceability.]
        </LawyerNote>
      </LegalSection>

      <LegalSection title="No Endorsement">
        <p>
          CheckRay does not endorse, recommend, or validate any person,
          company, product, service, or course of action. References to official
          resources (FTC, banks, government agencies, etc.) are for
          informational convenience only and do not imply any affiliation or
          endorsement.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
