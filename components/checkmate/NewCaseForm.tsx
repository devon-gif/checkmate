'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

import { IconArrowRight, IconSpinner } from '@/components/ui/icons'
import { LegalDisclaimer } from '@/components/legal-disclaimer'
import { GlassCard } from './GlassCard'
import { GradientButton } from './GradientButton'

export function NewCaseForm() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/analyze-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, url })
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Analysis failed')
      toast.success('Case analyzed')
      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Analysis failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = !isSubmitting && (text.trim() !== '' || url.trim() !== '')

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {/* Paste area */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="cm-text"
          className="text-sm font-medium text-white/80"
        >
          Paste suspicious text
        </label>
        <textarea
          id="cm-text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste a text message, email, invoice notice, job offer, rental listing, marketplace message, or URL…"
          rows={8}
          className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-cm-green/40 focus:ring-2 focus:ring-cm-green/20"
        />
      </div>

      {/* URL input */}
      <div className="flex flex-col gap-2">
        <label htmlFor="cm-url" className="text-sm font-medium text-white/80">
          URL{' '}
          <span className="text-white/30 font-normal">(optional)</span>
        </label>
        <input
          id="cm-url"
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://suspicious-link.example.com"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-cm-green/40 focus:ring-2 focus:ring-cm-green/20"
        />
      </div>

      {/* Submit row */}
      <div className="flex flex-col gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-white/30">
          CheckMate may be wrong. Results are informational only — not advice.
        </p>
        <GradientButton
          type="submit"
          variant={canSubmit ? 'primary' : 'secondary'}
          className={!canSubmit ? 'cursor-not-allowed opacity-40' : ''}
        >
          {isSubmitting ? (
            <>
              <IconSpinner className="mr-2 h-4 w-4 animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              <IconArrowRight className="mr-2 h-4 w-4" />
              Analyze case
            </>
          )}
        </GradientButton>
      </div>

      <LegalDisclaimer variant="default" className="mt-1" />
    </form>
  )
}
