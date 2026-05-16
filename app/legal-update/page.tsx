import { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { LegalReacceptanceModal } from '@/components/legal-reacceptance-modal'

export const metadata: Metadata = {
  title: 'Updated Terms | CheckRay'
}

interface Props {
  searchParams: { redirectedFrom?: string }
}

export default async function LegalUpdatePage({ searchParams }: Props) {
  const cookieStore = cookies()
  const session = await auth({ cookieStore })

  if (!session?.user) {
    redirect('/sign-in')
  }

  // After acceptance, send the user back to where they were trying to go.
  // Fall back to /dashboard if no redirectedFrom is present or it looks unsafe.
  const raw = searchParams.redirectedFrom ?? ''
  const redirectTo =
    raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard'

  console.log('[legal-update] user:', session.user.id, 'redirectTo after acceptance:', redirectTo)

  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.16))] items-center justify-center">
      {/* Modal is always open on this page; closing is only possible via acceptance */}
      <LegalReacceptanceModal open redirectTo={redirectTo} />
    </div>
  )
}

