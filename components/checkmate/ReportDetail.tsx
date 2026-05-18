'use client'

import * as React from 'react'
import { CaseRiskBadge } from '@/components/case-risk-badge'
import { LegalDisclaimer } from '@/components/legal-disclaimer'
import { GlassCard } from '@/components/checkmate/GlassCard'
import { GradientButton } from '@/components/checkmate/GradientButton'
import { humanizeCategory, ANALYSIS_DISCLAIMER } from '@/lib/checkmate-shared'
import type { Database, Json } from '@/lib/db_types'

type CaseRow = Database['public']['Tables']['cases']['Row']
type ReportRow = Database['public']['Tables']['risk_reports']['Row']

function asStringArray(value: Json): string[] {
  return Array.isArray(value)
    ? value.filter((x): x is string => typeof x === 'string')
    : []
}

interface ReportDetailProps {
  caseRow: CaseRow
  report: ReportRow | null
}

export function ReportDetail({ caseRow, report }: ReportDetailProps) {
  const [copied, setCopied] = React.useState(false)
  const [followUp, setFollowUp] = React.useState('')
  const [trustedCopied, setTrustedCopied] = React.useState(false)
  const [trustedOpen, setTrustedOpen] = React.useState(false)

  const redFlags = report ? asStringArray(report.red_flags) : []
  const actions = report ? asStringArray(report.recommended_actions) : []
  const safeReply = report?.safe_reply ?? null
  function buildTrustedMessage() {
    const riskLevel = caseRow.risk_level ?? 'unknown'
    const topFlags = redFlags.slice(0, 3)
    const topAction = actions[0] ?? 'verify through official channels'
    if (topFlags.length === 0) {
      return `Can you take a quick look before I act? I checked this with CheckRay and Ray did not find major red flags, but suggested verifying through official channels first.\n\nRay can be wrong. Verify through official sources.`
    }
    return `Can you take a quick look before I act? I checked this with CheckRay and Ray found ${riskLevel} risk.\n\nMain red flags:\n${topFlags.map(f => `• ${f}`).join('\n')}\n\nRay suggests: ${topAction}\n\nResults can be wrong, but I want a second opinion before I click, pay, reply, or apply.\n\nRay can be wrong. Verify through official sources.`
  }

  function copyTrustedMessage() {
    const msg = buildTrustedMessage()
    navigator.clipboard.writeText(msg).then(() => {
      setTrustedCopied(true)
      setTimeout(() => setTrustedCopied(false), 2500)
    })
  }

  function copyReply() {
    if (!safeReply) return
    navigator.clipboard.writeText(safeReply).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      {/* Back */}
      <div>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-white/40 transition hover:text-cm-green"
        >
          ← Back to dashboard
        </a>
      </div>

      {/* Header */}
      <GlassCard className="px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] capitalize text-white/50">
                {humanizeCategory(caseRow.category)}
              </span>
              <CaseRiskBadge level={caseRow.risk_level} />
              <span className="font-mono text-sm text-white/60">
                Score: {caseRow.risk_score}
              </span>
            </div>
            <h1 className="mt-3 text-xl font-semibold text-white">
              {caseRow.title}
            </h1>
            <p className="mt-1 text-xs text-white/30">
              {new Date(caseRow.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Original input */}
      {caseRow.input_text && (
        <GlassCard className="px-6 py-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">
            Original input
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-7 text-white/60">
            {caseRow.input_text}
          </p>
        </GlassCard>
      )}

      {report ? (
        <>
          {/* Summary */}
          {report.summary && (
            <GlassCard className="px-6 py-5">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">
                Ray&apos;s summary
              </h2>
              <p className="text-sm leading-7 text-white/70">{report.summary}</p>
            </GlassCard>
          )}

          {/* Red flags */}
          {redFlags.length > 0 && (
            <GlassCard className="px-6 py-5">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">
                Red flags Ray noticed
              </h2>
              <ul className="space-y-2">
                {redFlags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-red-500/20 text-[10px] text-red-400">
                      !
                    </span>
                    <span className="text-sm leading-6 text-white/60">{flag}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          )}

          {/* Recommended actions */}
          {actions.length > 0 && (
            <GlassCard className="px-6 py-5">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">
                Suggested next steps
              </h2>
              <ol className="space-y-2">
                {actions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cm-green/10 text-[11px] font-semibold text-cm-green">
                      {i + 1}
                    </span>
                    <span className="text-sm leading-6 text-white/60">{action}</span>
                  </li>
                ))}
              </ol>
            </GlassCard>
          )}

          {/* Safer reply */}
          {safeReply && (
            <GlassCard className="px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-white/40">
                  Safer reply
                </h2>
                <button
                  type="button"
                  onClick={copyReply}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 transition hover:border-cm-green/30 hover:text-cm-green"
                >
                  {copied ? '✓ Copied' : 'Copy safer reply'}
                </button>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/60">
                {safeReply}
              </p>
            </GlassCard>
          )}

          {/* Trusted Circle */}
          <GlassCard className="px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-white/40">
                  Ask someone you trust
                </h2>
                <p className="mt-1 text-xs text-white/35">
                  Ray builds a plain-English summary you can send to a friend, parent, or advisor before you act.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTrustedOpen(o => !o)}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 transition hover:border-cm-green/30 hover:text-cm-green"
              >
                {trustedOpen ? 'Hide' : 'Get summary'}
              </button>
            </div>

            {trustedOpen && (
              <div className="mt-4">
                <pre className="whitespace-pre-wrap rounded-lg border border-white/8 bg-white/3 px-4 py-3 text-xs leading-6 text-white/55">
                  {buildTrustedMessage()}
                </pre>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={copyTrustedMessage}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 transition hover:border-cm-green/30 hover:text-cm-green"
                  >
                    {trustedCopied ? '✓ Copied' : 'Copy message'}
                  </button>
                  <span className="text-[10px] text-white/20">
                    Ray can be wrong. Verify through official sources.
                  </span>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Ask Ray follow-up — coming soon */}
          <GlassCard className="px-6 py-5">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/40">
              Ask Ray a follow-up
            </h2>
            <p className="mb-3 text-xs text-white/25">
              Coming soon — follow-up questions on this check.
            </p>
            <div className="flex gap-3 opacity-50">
              <input
                type="text"
                value={followUp}
                onChange={e => setFollowUp(e.target.value)}
                placeholder="Example: What should I ask before replying?"
                disabled
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/50 placeholder-white/20 focus:outline-none"
              />
              <button
                disabled
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/30 cursor-not-allowed"
              >
                Ask Ray
              </button>
            </div>
          </GlassCard>
        </>
      ) : (
        <GlassCard className="px-6 py-10 text-center">
          <p className="text-sm text-white/40">No report found for this check.</p>
        </GlassCard>
      )}

      {/* Disclaimer */}
      <div className="rounded-xl border border-white/8 bg-white/3 px-5 py-4">
        <p className="text-[11px] leading-5 text-white/30">{ANALYSIS_DISCLAIMER}</p>
      </div>

      <div className="flex justify-center">
        <GradientButton href="/cases/new" variant="primary">
          Run another check
        </GradientButton>
      </div>

      <LegalDisclaimer variant="default" className="mb-4" />
    </div>
  )
}
