import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth } from '@/auth'
import { AuthSetupNotice } from '@/components/auth-setup-notice'
import { hasSupabasePublicEnv } from '@/lib/env'
import { areAdminToolsEnabled, getAdminAccess } from '@/lib/admin/access'
import { AdminLoginForm } from './AdminLoginForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Admin Login | CheckRay',
  robots: { index: false, follow: false }
}

function adminRedirectPath() {
  const configured = process.env.ADMIN_LOGIN_REDIRECT
  return configured?.startsWith('/admin') ? configured : '/admin'
}

export default async function AdminLoginPage() {
  if (!hasSupabasePublicEnv()) {
    return (
      <div className="flex min-h-[calc(100vh-theme(spacing.16))] flex-col items-center justify-center bg-black px-4 py-10">
        <AuthSetupNotice action="sign-in" />
      </div>
    )
  }

  const cookieStore = cookies()
  const session = await auth({ cookieStore })
  const access = session?.user ? await getAdminAccess() : null
  if (access?.ok) {
    redirect(adminRedirectPath())
  }

  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.16))] flex-col items-center justify-center bg-black px-4 py-16">
      <div className="mx-auto w-full max-w-sm">
        <div className="rounded-xl border border-white/10 bg-black p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Admin login
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Admin only.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-white/35">
            Use the same Google account listed in ADMIN_EMAILS.
          </p>

          {!areAdminToolsEnabled() && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-yellow-400/25 bg-yellow-400/8 px-4 py-3 text-sm text-yellow-100"
            >
              Admin tools are not available.
            </div>
          )}

          {access?.reason === 'forbidden' && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-red-400/25 bg-red-400/8 px-4 py-3 text-sm text-red-200"
            >
              This account is not authorized for admin access.
            </div>
          )}

          <div className="mt-6">
            <AdminLoginForm redirectTo={adminRedirectPath()} />
          </div>
        </div>
      </div>
    </div>
  )
}
