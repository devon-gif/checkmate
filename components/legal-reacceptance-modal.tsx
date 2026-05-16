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
import { TERMS_VERSION, PRIVACY_VERSION, AI_DISCLOSURE_VERSION } from '@/lib/legalCopy'

// localStorage key — fast client-side check before the middleware DB query
export const LEGAL_LS_KEY = 'checkray_legal_accepted_v1'
// Value stored is a composite of all current legal versions
const LEGAL_LS_VALUE = `${TERMS_VERSION}|${PRIVACY_VERSION}|${AI_DISCLOSURE_VERSION}`

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
    console.log('[legal] attempting acceptance, versions:', LEGAL_LS_VALUE)

    try {
      const res = await fetch('/api/legal/accept', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.error('[legal] API error:', res.status, body)
        throw new Error('Failed to record acceptance')
      }

      // Persist acceptance client-side so it survives the next middleware check
      try {
        localStorage.setItem(LEGAL_LS_KEY, LEGAL_LS_VALUE)
        console.log('[legal] localStorage acceptance set:', LEGAL_LS_VALUE)
      } catch {
        // localStorage unavailable (private mode edge case) — non-fatal
      }

      console.log('[legal] acceptance saved, redirecting to /dashboard')
      toast.success('Terms accepted. Welcome to CheckRay!')

      // router.push navigates away from /legal-update so the modal disappears.
      // router.refresh() alone only re-renders the same page — that was the bug.
      router.push('/dashboard')
    } catch {
      toast.error('Something went wrong. Please try again.')
      setIsLoading(false)
    }
    // Note: setIsLoading(false) intentionally omitted on success path —
    // button stays in loading state until the /dashboard navigation completes.
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
            continue using CheckRay.
          </DialogDescription>
        </DialogHeader>

        <p className="rounded-md border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          CheckRay is not a law firm. Results are informational only, not
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
            continue using CheckRay.
          </DialogDescription>
        </DialogHeader>

        <p className="rounded-md border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          CheckRay is not a law firm. Results are informational only, not
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
