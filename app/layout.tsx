import { Metadata } from 'next'

import { Toaster } from 'react-hot-toast'

import '@/app/globals.css'
import { fontMono, fontSans } from '@/lib/fonts'
import { cn } from '@/lib/utils'
import { TailwindIndicator } from '@/components/tailwind-indicator'
import { Providers } from '@/components/providers'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { AdminFooterLink } from '@/components/admin-footer-link'

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  ),
  title: {
    default: 'CheckRay \u2014 Check ghost jobs, scam texts, links, and bills',
    template: `%s \u2014 CheckRay`
  },
  description:
    'Paste a job post, recruiter message, suspicious text, link, or bill. Ray gives you a risk score, red flags, and what to do next \u2014 free, no account required.',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' }
  ],
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png'
  }
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          'font-sans antialiased',
          fontSans.variable,
          fontMono.variable
        )}
      >
        <Toaster />
        <Providers attribute="class" defaultTheme="dark" enableSystem>
          <div className="flex min-h-screen flex-col">
            {/* @ts-ignore */}
            <Header />
            <main className="flex flex-1 flex-col">{children}</main>
            <Footer />
            {/* Admin-only "Admin tools" link, rendered OUTSIDE the Footer
                so its `server-only` import doesn't get pulled into the
                client bundle. Footer is imported by client components
                (chat-panel via FooterText), which would otherwise drag
                this server-only module across the client/server boundary
                and break the build. Component returns null for normal
                users — non-admins see no DOM trace of it. */}
            <AdminFooterLink />
          </div>
          <TailwindIndicator />
        </Providers>
      </body>
    </html>
  )
}
