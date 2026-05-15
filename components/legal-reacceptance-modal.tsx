'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { IconSpinner } from '@/components/ui/icons'
import { ConsentCheckbox } from '@/components/consent-checkbox'

interface LegalReacceptanceModalProps {
  open: boolean
}

/**
 * Shown when a logged-in user's accepted legal versions are out of date.
 * Forces them to re-accept before continuing.
 */
export function LegalReacceptanceModal({ open }: LegalReacceptanceModalProps) {
  const router = useRouter()
  const [checked, setChecked] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  const handleAccept = async () => {
    if (!checked) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/legal/accept', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to record acceptance')
      toast.success('Terms accepted. Welcome back!')
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={e => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Updated Terms & Policies</DialogTitle>
          <DialogDescription>
            We&apos;ve updated our Terms of Service, Privacy Policy, and/or AI
            Disclosure. Please review and accept the updated documents to
            continue using CheckMate.
          </DialogDescription>
        </DialogHeader>

        <p className="rounded-md border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          CheckMate is not a law firm. Results are informational only — not
          legal, financial, or medical advice. AI analysis can be wrong. Verify
          before acting.
        </p>

        <ConsentCheckbox
          checked={checked}
          onCheckedChange={setChecked}
          disabled={isLoading}
          className="mt-2"
        />

        <DialogFooter className="mt-2">
          <Button
            onClick={handleAccept}
            disabled={!checked || isLoading}
            className="w-full"
          >
            {isLoading && <IconSpinner className="mr-2 animate-spin" />}
            Accept & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
