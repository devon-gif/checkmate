import { Metadata } from 'next'
import Link from 'next/link'
import { AI_DISCLOSURE_VERSION } from '@/lib/legalCopy'
import {
  LegalPage,
  LegalSection,
  LawyerNote,
  LegalFooterLinks
} from '@/components/legal-page-layout'

export const metadata: Metadata = {
  title: 'AI Disclosure – CheckRay',
  description: 'How CheckRay uses artificial intelligence'
}

export default function AiDisclosurePage() {
  return (
    <LegalPage
      title="AI Disclosure"
      version={AI_DISCLOSURE_VERSION}
      effectiveDate="May 15, 2026"
    >
      <LegalSection title="1. How CheckRay Uses AI">
        <p>
          CheckRay uses large language models (LLMs) and automated heuristics
          to analyze content you submit and generate risk assessments, red
          flags, and suggested next steps. The AI component is provided by a
          third-party AI model provider (currently OpenAI).
        </p>
        <p>
          CheckRay is designed to help you identify possible risks and organize
          next steps, not to replace professional judgment.
        </p>
      </LegalSection>

      <LegalSection title="2. AI Can Be Wrong">
        <p>
          Artificial intelligence is probabilistic. Results are based on
          patterns in training data and the content you submit.
          CheckRay&rsquo;s AI analysis:
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            Can produce false positives (flagging something legitimate as
            suspicious)
          </li>
          <li>Can produce false negatives (missing a genuine threat)</li>
          <li>
            Cannot access real-time databases, law enforcement records, or live
            business registries
          </li>
          <li>
            Does not have legal, regulatory, medical, or financial expertise
          </li>
          <li>
            Does not verify the identity of any person, company, or institution
          </li>
        </ul>
        <p className="font-medium">
          Never rely solely on CheckRay&rsquo;s output when making financial,
          legal, health, safety, or other high-stakes decisions.
        </p>
      </LegalSection>

      <LegalSection title="3. What AI Analysis Is and Is Not">
        <p>CheckRay&rsquo;s AI outputs are:</p>
        <ul className="list-inside list-disc space-y-1">
          <li>Informational risk signals, not determinations of fact</li>
          <li>Probabilistic assessments, not guarantees</li>
          <li>Starting points for your own investigation, not final answers</li>
        </ul>
        <p>CheckRay&rsquo;s AI outputs are NOT:</p>
        <ul className="list-inside list-disc space-y-1">
          <li>Legal advice or legal opinions</li>
          <li>Financial or investment advice</li>
          <li>Medical or health advice</li>
          <li>Verification of any person, document, or institution</li>
          <li>
            A guarantee that anything is safe, legitimate, fraudulent, or
            harmful
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Risk Score Methodology">
        <p>
          Risk scores are calculated using a combination of AI pattern
          recognition, rule-based heuristics, and content signals. They
          represent a relative likelihood of risk based on observable features,
          not an absolute judgment.
        </p>
        <p>
          A low risk score does not mean something is safe. A high risk score
          does not mean something is definitely fraudulent. Always verify before
          acting.
        </p>
      </LegalSection>

      <LegalSection title="5. Third-Party AI Provider">
        <p>
          Submitted content is processed by a third-party AI model provider. By
          using CheckRay, you acknowledge that content you submit may be sent
          to that provider&rsquo;s API for processing, subject to their privacy
          and data-use policies. We do not use your submitted content to train
          AI models for resale or third-party use.
        </p>
        <LawyerNote>
          [LAWYER REVIEW: confirm AI provider data processing agreements,
          HIPAA/medical-data restrictions, and whether any submitted content
          could constitute protected health information or other regulated data
          categories.]
        </LawyerNote>
      </LegalSection>

      <LegalSection title="6. Recommended Actions for High-Stakes Situations">
        <p>
          In emergencies, imminent threats, identity theft, fraud loss, legal
          deadlines, medical issues, or financial harm: contact the relevant
          professional, institution, or authority immediately. Do not wait for
          AI analysis.
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            Suspected fraud or identity theft: contact your bank and the FTC
            (reportfraud.ftc.gov)
          </li>
          <li>Legal matters: consult a licensed attorney</li>
          <li>Medical concerns: contact a licensed healthcare provider</li>
          <li>Financial concerns: consult a licensed financial advisor</li>
          <li>
            Immediate safety threats: call 911 or local emergency services
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="7. No Guarantee of Accuracy">
        <p>
          We do not claim that our AI is &ldquo;100% accurate,&rdquo; provides
          &ldquo;guaranteed protection,&rdquo; &ldquo;prevents scams,&rdquo; or
          &ldquo;verifies everything.&rdquo; These claims would be false.
          CheckRay provides an extra layer of caution, not certainty.
        </p>
      </LegalSection>

      <LegalSection title="8. Updates to AI Systems">
        <p>
          We may update our AI models, analysis methods, and scoring logic at
          any time to improve accuracy and coverage. Material changes to how AI
          is used will be reflected in an updated version of this disclosure.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
