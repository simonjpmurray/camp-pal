import type { Metadata, Viewport } from 'next'
import { Nunito, Space_Mono } from 'next/font/google'
import './globals.css'
import { Analytics } from '@vercel/analytics/next'

// Family Forest type system — rounded, friendly Nunito + Space Mono for data labels
const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  style: ['normal', 'italic'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
})
const spaceMono = Space_Mono({
  subsets: ['latin'],
  variable: '--font-space-mono',
  weight: ['400', '700'],
  display: 'swap',
})
import { AnonymousAuth } from '@/components/auth/AnonymousAuth'
import { DisplayNamePrompt } from '@/components/auth/DisplayNamePrompt'
import { WelcomeToast } from '@/components/ui/WelcomeToast'

export const metadata: Metadata = {
  title: 'CampFire — Plan your adventure together',
  description: 'Coordinate camping trips with your crew. Smart packing lists, group chat, and weather-aware gear suggestions.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CampFire',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#d4541e' },
    { media: '(prefers-color-scheme: dark)', color: '#e86a2e' },
  ],
}

// Inline script runs before paint — prevents dark mode flash
const darkModeScript = `
  (function() {
    try {
      var stored = localStorage.getItem('theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (stored === 'dark' || (!stored && prefersDark)) {
        document.documentElement.classList.add('dark');
      }
    } catch(e) {}
  })();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`h-full ${nunito.variable} ${spaceMono.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script dangerouslySetInnerHTML={{ __html: darkModeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AnonymousAuth />
        <DisplayNamePrompt />
        <WelcomeToast />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
