import { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { LegalReacceptanceModal } from '@/components/legal-reacceptance-modal'

export const metadata: Metadata = {
  title: 'Updated Terms – CheckRay'
}

export default async function LegalUpdatePage() {
  const cookieStore = cookies()
  const session = await auth({ cookieStore })

  if (!session?.user) {
    redirect('/sign-in')
  }

  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.16))] items-center justify-center">
      {/* Modal is always open on this page; closing is only possible via acceptance */}
      <LegalReacceptanceModal open />
    </div>
  )
}
