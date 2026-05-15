'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { IconArrowRight, IconSpinner } from '@/components/ui/icons'

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
        headers: {
          'Content-Type': 'application/json'
        },
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

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="case-text" className="text-sm font-medium">
          Paste suspicious text
        </label>
        <Textarea
          id="case-text"
          value={text}
          onChange={event => setText(event.target.value)}
          placeholder="Paste a text, email, bill notice, job message, rental listing, or marketplace conversation..."
          className="min-h-[220px] resize-y bg-background"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="case-url" className="text-sm font-medium">
          URL
        </label>
        <Input
          id="case-url"
          value={url}
          onChange={event => setUrl(event.target.value)}
          placeholder="https://example.com/suspicious-link"
          type="url"
          className="bg-background"
        />
      </div>

      <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          This MVP uses a free stub analyzer. No paid AI call is made.
        </p>
        <Button
          type="submit"
          disabled={isSubmitting || (!text.trim() && !url.trim())}
        >
          {isSubmitting ? (
            <IconSpinner className="mr-2" />
          ) : (
            <IconArrowRight className="mr-2" />
          )}
          Analyze case
        </Button>
      </div>
    </form>
  )
}
