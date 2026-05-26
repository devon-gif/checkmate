import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth } from '@/auth'
import { AuthSetupNotice } from '@/components/auth-setup-notice'
import { GlassCard } from '@/components/checkmate/GlassCard'
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
    <div className="relative flex min-h-[calc(100vh-theme(spacing.16))] flex-col items-center justify-center overflow-hidden bg-deep px-4 py-16">
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute left-1/2 top-0 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-cm-green/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-sm">
        <GlassCard className="p-8 shadow-[0_0_60px_rgba(122,226,207,0.07)]">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            CheckRay Admin
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Enter your admin email and we&apos;ll send a secure sign-in link.
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
            <AdminLoginForm />
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
