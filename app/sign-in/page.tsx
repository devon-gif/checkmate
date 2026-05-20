import { auth } from '@/auth'
import { AuthSetupNotice } from '@/components/auth-setup-notice'
import { LoginButton } from '@/components/login-button'
import { LoginForm } from '@/components/login-form'
import { Separator } from '@/components/ui/separator'
import { hasSupabasePublicEnv } from '@/lib/env'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function SignInPage() {
  // If Supabase public env vars are missing, show a clean notice instead
  // of letting the client-side Supabase client throw on render.
  if (!hasSupabasePublicEnv()) {
    return (
      <div className="flex h-[calc(100vh-theme(spacing.16))] flex-col items-center justify-center py-10">
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
    <div className="flex h-[calc(100vh-theme(spacing.16))] flex-col items-center justify-center py-10">
      <div className="w-full max-w-sm">
        <LoginForm action="sign-in" />
        <Separator className="my-4" />
        <div className="flex justify-center">
          <LoginButton />
        </div>
      </div>
    </div>
  )
}
