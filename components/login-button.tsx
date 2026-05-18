'use client'

import * as React from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

import { cn } from '@/lib/utils'
import { Button, type ButtonProps } from '@/components/ui/button'
import { IconGitHub, IconSpinner } from '@/components/ui/icons'

const supabaseConfigured =
  typeof process !== 'undefined' &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

interface LoginButtonProps extends ButtonProps {
  showGithubIcon?: boolean
  text?: string
}

export function LoginButton({
  text = 'Login with GitHub',
  showGithubIcon = true,
  className,
  ...props
}: LoginButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false)

  if (process.env.NEXT_PUBLIC_AUTH_GITHUB !== 'true') {
    return null
  }

  // Don't render if Supabase is not configured — avoids "supabaseUrl is required!" crash
  if (!supabaseConfigured) {
    return null
  }

  // Create a Supabase client configured to use cookies — only reached when
  // env vars are confirmed present above, so this never throws.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const supabase = createClientComponentClient()

  return (
    <Button
      variant="outline"
      onClick={async () => {
        setIsLoading(true)
        await supabase.auth.signInWithOAuth({
          provider: 'github',
          options: { redirectTo: `${location.origin}/api/auth/callback` }
        })
      }}
      disabled={isLoading}
      className={cn(className)}
      {...props}
    >
      {isLoading ? (
        <IconSpinner className="mr-2 animate-spin" />
      ) : showGithubIcon ? (
        <IconGitHub className="mr-2" />
      ) : null}
      {text}
    </Button>
  )
}
