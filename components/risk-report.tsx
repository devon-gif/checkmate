'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { type CaseCategory, type RiskLevel, humanizeCategory } from '@/lib/checkmate-shared'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RiskReportData {
  category: CaseCategory
  risk_score: number
  risk_level: RiskLevel
  confidence_level?: 'low' | 'medium' | 'high'
  summary: string
  evidence_found?: string[]
  red_flags: string[]
  missing_information?: string[]
  recommended_actions: string[]
  verification_steps?: string[]
  safe_reply: string
  disclaimer: string
  case_id?: string
}

interface RiskReportProps {
  report: RiskReportData
  className?: string
}

// ─── Risk level config ────────────────────────────────────────────────────────

const levelConfig: Record<
  RiskLevel,
  { label: string; bar: string; badge: string; border: string; icon: string }
> = {
  low: {
    label: 'Low risk',
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    border: 'border-emerald-200',
    icon: '✓'
  },
  medium: {
    label: 'Medium risk',
    bar: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    border: 'border-amber-200',
    icon: '⚠'
  },
  high: {
    label: 'High risk',
    bar: 'bg-orange-500',
    badge: 'bg-orange-50 text-orange-800 border-orange-200',
    border: 'border-orange-200',
    icon: '⚠'
  },
  very_high: {
    label: 'Very high risk',
    bar: 'bg-red-500',
    badge: 'bg-red-50 text-red-800 border-red-200',
    border: 'border-red-200',
    icon: '✕'
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  )
}

function BulletList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn('space-y-2', className)}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed">
          <span className="mt-0.5 shrink-0 text-muted-foreground">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function ScoreBar({ score, level }: { score: number; level: RiskLevel }) {
  const cfg = levelConfig[level]
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Ray’s read</span>
        <span className="text-sm font-semibold tabular-nums">{score} / 100</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all duration-700', cfg.bar)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      type="button"
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy
        </>
      )}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RiskReport({ report, className }: RiskReportProps) {
  const cfg = levelConfig[report.risk_level]

  return (
    <div className={cn('space-y-5 rounded-xl border bg-background shadow-sm', cfg.border, className)}>
      {/* Header */}
      <div className={cn('flex flex-col gap-4 rounded-t-xl border-b p-5 sm:flex-row sm:items-start sm:justify-between', cfg.border)}>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                cfg.badge
              )}
            >
              <span aria-hidden="true">{cfg.icon}</span>
              {cfg.label}
            </span>
            <span className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground">
              {humanizeCategory(report.category)}
            </span>
            {report.confidence_level && (
              <span className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground">
                {report.confidence_level} confidence
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-foreground">{report.summary}</p>
        </div>
        <div className="w-full shrink-0 sm:w-48">
          <ScoreBar score={report.risk_score} level={report.risk_level} />
        </div>
      </div>

      {/* Body */}
      <div className="grid gap-5 px-5 sm:grid-cols-2">
        {/* Evidence */}
        {report.evidence_found && report.evidence_found.length > 0 && (
          <section>
            <SectionHeading>Evidence found</SectionHeading>
            <BulletList items={report.evidence_found} />
          </section>
        )}

        {/* Red flags */}
        {report.red_flags.length > 0 && (
          <section>
            <SectionHeading>
              <span className="flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500" aria-hidden="true">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
                Red flags Ray noticed
              </span>
            </SectionHeading>
            <ul className="space-y-2">
              {report.red_flags.map((flag, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed">
                  <span className="mt-0.5 shrink-0 font-medium text-red-500">•</span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Verification steps */}
        {report.verification_steps && report.verification_steps.length > 0 && (
          <section>
            <SectionHeading>What to verify next</SectionHeading>
            <BulletList items={report.verification_steps} />
          </section>
        )}

        {/* Missing information */}
        {report.missing_information && report.missing_information.length > 0 && (
          <section>
            <SectionHeading>Missing information</SectionHeading>
            <BulletList items={report.missing_information} />
          </section>
        )}

        {/* Recommended actions */}
        {report.recommended_actions.length > 0 && (
          <section>
            <SectionHeading>
              <span className="flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500" aria-hidden="true">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Safer next steps
              </span>
            </SectionHeading>
            <BulletList items={report.recommended_actions} />
          </section>
        )}
      </div>

      {/* Safe reply */}
      {report.safe_reply && (
      <section className="mx-5 rounded-lg border border-border bg-muted/40 p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <SectionHeading>
            <span className="flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Safer reply from Ray
            </span>
          </SectionHeading>
          <CopyButton text={report.safe_reply} />
        </div>
        <p className="text-sm italic leading-relaxed text-muted-foreground">
          &ldquo;{report.safe_reply}&rdquo;
        </p>
      </section>
      )}

      {/* Job-specific educational footer — appears only for cases the
          analyzer tagged as a job scam or ghost job. Pure copy; doesn't
          read or change the analyzer response shape. */}
      {report.category === 'job_scam_or_ghost_job' && (
        <section className="mx-5 rounded-lg border border-border/70 bg-muted/30 p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Heads-up.</span>{' '}
            Don&apos;t ignore a real opportunity. Don&apos;t walk into a fake
            one. Verify the company, recruiter, domain, and any payment
            requests through official channels before you reply, sign, or
            send money.
          </p>
        </section>
      )}

      {/* Disclaimer */}
      <div className="rounded-b-xl border-t border-border bg-muted/30 px-5 py-3">
        <p className="text-xs leading-relaxed text-muted-foreground">{report.disclaimer}</p>
      </div>
    </div>
  )
}
