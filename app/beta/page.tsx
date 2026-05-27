'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { fadeUp, fadeIn, staggerContainer } from '@/lib/animations'

const USE_CASES = [
  { value: 'jobs', label: 'Job offers / recruiter messages' },
  { value: 'texts', label: 'Suspicious texts' },
  { value: 'bills', label: 'Bills or payment requests' },
  { value: 'phishing', label: 'Phishing links' },
  { value: 'marketplace', label: 'Marketplace or rental listings' },
  { value: 'family', label: 'Family safety' },
  { value: 'other', label: 'Other' }
]

type FormState = {
  name: string
  email: string
  useCase: string
  note: string
  understood: boolean
}

export default function BetaPage() {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    useCase: '',
    note: '',
    understood: false
  })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setErrorMsg('')

    try {
      const res = await fetch('/api/beta/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.')
        setStatus('error')
      } else {
        setStatus('success')
      }
    } catch (_err) {
      setErrorMsg('Something went wrong. Please try again or email devonavich0@gmail.com.')
      setStatus('error')
    }
  }

  const inputClass =
    'w-full rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-white/30 outline-none transition-all focus:ring-1'
  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.10)',
    boxShadow: 'none'
  } as React.CSSProperties
  const inputFocusRing = 'focus:ring-[rgba(122,226,207,0.35)]'

  return (
    <div
      className="relative min-h-screen"
      style={{ background: '#050d15' }}
    >
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        <div
          className="absolute top-[-10%] left-[30%] size-[50rem] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #7ae2cf 0%, transparent 65%)', filter: 'blur(80px)' }}
        />
        <div
          className="absolute bottom-0 right-[-10%] size-[35rem] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #7ae2cf 0%, transparent 70%)', filter: 'blur(80px)' }}
        />
      </div>

      <div className="center py-20 max-md:py-14">
        {/* Back link */}
        <motion.div variants={fadeIn} initial="initial" animate="animate">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12px] text-white/35 hover:text-white/60 transition-colors mb-10"
          >
            <svg className="size-3.5" fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7H1M6 2L1 7l5 5" />
            </svg>
            Back to CheckRay
          </Link>
        </motion.div>

        <div className="mx-auto max-w-[520px]">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="mb-10 text-center"
          >
            {/* Eyebrow */}
            <motion.div
              variants={fadeUp}
              className="mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5"
              style={{
                background: 'rgba(122,226,207,0.08)',
                border: '1px solid rgba(122,226,207,0.18)'
              }}
            >
              <span
                className="size-1.5 rounded-full animate-pulse"
                style={{ background: '#7ae2cf', boxShadow: '0 0 6px rgba(122,226,207,0.7)' }}
              />
              <span
                className="text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: '#7ae2cf' }}
              >
                Beta access
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="mb-4 bg-radial-white-1 bg-clip-text text-transparent"
              style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                fontWeight: 500
              }}
            >
              Request CheckRay<br />beta access
            </motion.h1>

            <motion.p variants={fadeUp} className="mb-3 text-description max-w-[400px] mx-auto leading-relaxed">
              Help us test CheckRay before public launch. If approved, you&apos;ll be able to try Ray without entering a card.
            </motion.p>

            <motion.p variants={fadeUp} className="text-[12px]" style={{ color: 'rgba(122,226,207,0.45)' }}>
              Beta access is manually approved and may be limited while we test.
            </motion.p>
          </motion.div>

          {/* ── Success state ── */}
          {status === 'success' ? (
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              className="rounded-2xl px-8 py-10 text-center"
              style={{
                background: 'rgba(122,226,207,0.05)',
                border: '1px solid rgba(122,226,207,0.18)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 0 48px rgba(122,226,207,0.06), 0 24px 60px rgba(0,0,0,0.35)'
              }}
            >
              <div
                className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full"
                style={{ background: 'rgba(122,226,207,0.12)', border: '1px solid rgba(122,226,207,0.3)' }}
              >
                <svg className="size-5" fill="none" viewBox="0 0 20 20" stroke="#7ae2cf" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 10l4 4 8-8" />
                </svg>
              </div>
              <h2 className="mb-3 text-[20px] font-semibold text-white">Request received</h2>
              <p className="text-description leading-relaxed max-w-[320px] mx-auto">
                If approved, you&apos;ll get beta access using the email you submitted. We&apos;ll be in touch.
              </p>
              <Link
                href="/"
                className="mt-8 inline-flex items-center gap-2 text-[13px] font-medium transition-colors hover:text-white"
                style={{ color: 'rgba(122,226,207,0.7)' }}
              >
                Back to CheckRay
                <svg className="size-3.5" fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M1 7h12M8 2l5 5-5 5" />
                </svg>
              </Link>
            </motion.div>
          ) : (
            /* ── Form ── */
            <motion.form
              variants={fadeUp}
              initial="initial"
              animate="animate"
              onSubmit={handleSubmit}
              noValidate
              className="rounded-2xl px-8 py-8 max-md:px-5 max-md:py-6 space-y-5"
              style={{
                background: 'linear-gradient(145deg, rgba(122,226,207,0.05) 0%, rgba(5,13,21,0.8) 70%)',
                border: '1px solid rgba(122,226,207,0.12)',
                backdropFilter: 'blur(24px)',
                boxShadow: '0 0 0 1px rgba(122,226,207,0.06), 0 24px 60px rgba(0,0,0,0.4)'
              }}
            >
              {/* Name */}
              <div>
                <label htmlFor="beta-name" className="mb-1.5 block text-[12px] font-medium text-white/50 uppercase tracking-wider">
                  Name
                </label>
                <input
                  id="beta-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className={`${inputClass} ${inputFocusRing}`}
                  style={inputStyle}
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="beta-email" className="mb-1.5 block text-[12px] font-medium text-white/50 uppercase tracking-wider">
                  Email
                </label>
                <input
                  id="beta-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className={`${inputClass} ${inputFocusRing}`}
                  style={inputStyle}
                />
              </div>

              {/* Use case */}
              <div>
                <label htmlFor="beta-use-case" className="mb-1.5 block text-[12px] font-medium text-white/50 uppercase tracking-wider">
                  What do you want to check?
                </label>
                <div className="relative">
                  <select
                    id="beta-use-case"
                    name="useCase"
                    value={form.useCase}
                    onChange={handleChange}
                    required
                    className={`${inputClass} ${inputFocusRing} appearance-none pr-10`}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="" disabled>Select a use case…</option>
                    {USE_CASES.map(uc => (
                      <option key={uc.value} value={uc.value} style={{ background: '#0d1a24' }}>
                        {uc.label}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-white/30"
                    fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l4 4 4-4" />
                  </svg>
                </div>
              </div>

              {/* Note */}
              <div>
                <label htmlFor="beta-note" className="mb-1.5 block text-[12px] font-medium text-white/50 uppercase tracking-wider">
                  Short note
                </label>
                <textarea
                  id="beta-note"
                  name="note"
                  rows={3}
                  placeholder="Tell us what you want to use CheckRay for."
                  value={form.note}
                  onChange={handleChange}
                  required
                  className={`${inputClass} ${inputFocusRing} resize-none`}
                  style={inputStyle}
                />
              </div>

              {/* Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    name="understood"
                    checked={form.understood}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div
                    className="size-5 rounded-md flex items-center justify-center transition-all"
                    style={{
                      background: form.understood ? 'rgba(122,226,207,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${form.understood ? 'rgba(122,226,207,0.5)' : 'rgba(255,255,255,0.12)'}`
                    }}
                    aria-hidden="true"
                  >
                    {form.understood && (
                      <svg className="size-3" fill="none" viewBox="0 0 12 12" stroke="#7ae2cf" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-[13px] leading-snug text-white/50 group-hover:text-white/70 transition-colors select-none">
                  I understand CheckRay is informational only and Ray can be wrong.
                </span>
              </label>

              {/* Error */}
              {status === 'error' && (
                <div
                  className="rounded-xl px-4 py-3 text-[13px] leading-snug"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', color: '#fca5a5' }}
                  role="alert"
                >
                  {errorMsg || 'Something went wrong. Please try again or email devonavich0@gmail.com.'}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-[14px] font-semibold text-[#050d15] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  background: 'linear-gradient(135deg, #7ae2cf 0%, #4bbfaa 100%)',
                  boxShadow: '0 0 0 1px rgba(122,226,207,0.3), 0 0 28px rgba(122,226,207,0.2)'
                }}
              >
                {status === 'submitting' ? (
                  <>
                    <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Sending…
                  </>
                ) : (
                  'Send beta request'
                )}
              </button>
            </motion.form>
          )}

          {/* Already approved note */}
          <motion.p
            variants={fadeIn}
            initial="initial"
            animate="animate"
            className="mt-6 text-center text-[12px] text-white/30"
          >
            Already approved?{' '}
            <Link href="/sign-up" className="text-white/55 underline underline-offset-2 hover:text-white transition-colors">
              Sign up
            </Link>{' '}
            or{' '}
            <Link href="/sign-in" className="text-white/55 underline underline-offset-2 hover:text-white transition-colors">
              sign in
            </Link>{' '}
            with the same email you submitted.
          </motion.p>

          {/* Contact lines */}
          <motion.div
            variants={fadeIn}
            initial="initial"
            animate="animate"
            className="mt-8 flex flex-col items-center gap-3 text-center"
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-[11px] uppercase tracking-wider text-white/25">Questions or beta access</span>
              <a
                href="mailto:support@checkray.app"
                className="text-[13px] text-white/50 hover:text-white transition-colors"
              >
                support@checkray.app
              </a>
            </div>
            <div className="w-px h-4 bg-white/10" aria-hidden="true" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-[11px] uppercase tracking-wider text-white/25">Want Ray to check something by email?</span>
              <a
                href="mailto:ray@checkray.app"
                className="text-[13px] transition-colors hover:text-white"
                style={{ color: 'rgba(122,226,207,0.65)' }}
              >
                ray@checkray.app
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
