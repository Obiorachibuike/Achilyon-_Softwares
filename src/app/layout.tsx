import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import type { ReactNode } from 'react'
import { AppProviders } from '@/providers/AppProviders'
import { AppShell } from '@/components/shell/AppShell'
import { publicConfig } from '@/lib/config'
import './globals.css'

// Self-hosted fonts (bundled by the `geist` package) — no network needed at build time.

export const metadata: Metadata = {
  metadataBase: new URL(publicConfig.appUrl),
  title: { default: 'Achilyon — Discover. Launch. Trade.', template: '%s — Achilyon' },
  description: 'Achilyon is a crypto market discovery and token launch platform: live token analytics, trending pairs, bonding-curve launches and risk signals across chains.',
  applicationName: 'Achilyon',
  keywords: ['crypto', 'token launchpad', 'bonding curve', 'dex screener', 'token discovery', 'new pairs', 'defi analytics'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Achilyon',
    title: 'Achilyon — Discover. Launch. Trade.',
    description: 'Discover the next market before everyone else.',
    url: '/',
  },
  twitter: { card: 'summary_large_image', title: 'Achilyon — Discover. Launch. Trade.', description: 'Discover the next market before everyone else.' },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#05070D',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  )
}
