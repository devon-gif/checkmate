import { auth } from '@/auth'
import { AuthSetupNotice } from '@/components/auth-setup-notice'
import { LoginForm } from '@/components/login-form'
import { hasSupabasePublicEnv } from '@/lib/env'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Create Account — CheckRay',
  description:
    'Sign up for CheckRay and get free scam and risk checks. Save reports, draft safer replies, and protect yourself before you click, pay, or reply.'
}

const perks = [
  { label: '3 free checks/month', sub: 'No credit card required' },
  { label: 'Saved reports', sub: 'Review history anytime' },
  { label: 'Safer reply drafts', sub: 'Ray writes it, you decide' },
  { label: 'Weekly Scam Watch', sub: 'On paid plans' },
]

export default async function SignUpPage() {
  if (!hasSupabasePublicEnv()) {
    return (
      <div className="flex min-h-[calc(100vh-theme(spacing.16))] flex-col items-center justify-center py-10">
        <AuthSetupNotice action="sign-up" />
      </div>
    )
  }

  const cookieStore = cookies()
  const session = await auth({ cookieStore })
  if (session?.user) {
    redirect('/dashboard')
  }

  return (
    <div className="relative flex min-h-[calc(100vh-theme(spacing.16))] flex-col items-center justify-center overflow-hidden bg-deep px-4 py-16">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
      >
        <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-cm-green/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[400px] rounded-full bg-cm-green/5 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-4xl">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">

          {/* ── Left panel: what you get ────────────────────────────── */}
          <div className="hidden lg:flex flex-col justify-center gap-8 pr-8">
            <div>
              <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-cm-green/30 bg-cm-green/10 px-3 py-1 text-xs font-medium text-cm-green">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 13l4 4L19 7" /></svg>
                Free to start
              </span>
              <h2 className="mt-3 text-2xl font-semibold leading-snug tracking-tight text-white">
                Your personal scam and risk detector
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/50">
                Paste any message, link, or job offer. Ray reads it, scores the risk, and tells you exactly what to watch out for — in plain English.
              </p>
            </div>

            <ul className="flex flex-col gap-3">
              {perks.map(p => (
                <li key={p.label} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cm-green/15">
                    <svg className="h-3 w-3 text-cm-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 13l4 4L19 7" /></svg>
                  </span>
                  <div>
                    <div className="text-sm font-medium text-white">{p.label}</div>
                    <div className="text-xs text-white/40">{p.sub}</div>
                  </div>
                </li>
              ))}
            </ul>

            <p className="text-xs leading-relaxed text-white/25">
              Ray can be wrong. Results are informational only — always verify through official sources.
            </p>
          </div>

          {/* ── Right panel: form card ──────────────────────────────── */}
          <div className="cm-glass rounded-3xl border border-white/10 p-8 shadow-[0_0_60px_rgba(122,226,207,0.07)]">
            {/* Badge */}
            <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-cm-green/30 bg-cm-green/10 px-3 py-1 text-xs font-medium text-cm-green">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              Free scam and risk checks
            </span>

            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Create your CheckRay account
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/50">
              Save your checks, track suspicious messages, and get a second look before you click, pay, reply, or apply.
            </p>

            <div className="mt-6">
              <LoginForm action="sign-up" />
            </div>

            {/* Mobile-only perks */}
            <ul className="mt-6 flex flex-col gap-2 border-t border-white/8 pt-5 lg:hidden">
              {perks.map(p => (
                <li key={p.label} className="flex items-center gap-2 text-xs text-white/40">
                  <svg className="h-3 w-3 flex-shrink-0 text-cm-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 13l4 4L19 7" /></svg>
                  <span><span className="text-white/60">{p.label}</span> — {p.sub}</span>
                </li>
              ))}
            </ul>

            <p className="mt-5 text-xs leading-relaxed text-white/25">
              Ray can be wrong. Results are informational only — always verify through official sources.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
