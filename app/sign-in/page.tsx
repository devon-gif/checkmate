import { auth } from '@/auth'
import { AuthSetupNotice } from '@/components/auth-setup-notice'
import { LoginForm } from '@/components/login-form'
import { hasSupabasePublicEnv } from '@/lib/env'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Sign In — CheckRay',
  description: 'Sign in to CheckRay to review saved checks and continue where you left off.'
}

export default async function SignInPage() {
  // If Supabase public env vars are missing, show a clean notice instead
  // of letting the client-side Supabase client throw on render.
  if (!hasSupabasePublicEnv()) {
    return (
      <div className="flex min-h-[calc(100vh-theme(spacing.16))] flex-col items-center justify-center py-10">
        <AuthSetupNotice action="sign-in" />
      </div>
    )
  }

  const cookieStore = cookies()
  const session = await auth({ cookieStore })
  // redirect to home if user is already logged in
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
      </div>

      <div className="relative z-10 mx-auto w-full max-w-sm">
        <div className="cm-glass rounded-3xl border border-white/10 p-8 shadow-[0_0_60px_rgba(122,226,207,0.07)]">
          {/* Badge */}
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-cm-green/30 bg-cm-green/10 px-3 py-1 text-xs font-medium text-cm-green">
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            CheckRay
          </span>

          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Welcome back to CheckRay
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            Sign in to review saved checks and continue where you left off.
          </p>

          <div className="mt-6">
            <LoginForm action="sign-in" />
          </div>
        </div>
      </div>
    </div>
  )
}
