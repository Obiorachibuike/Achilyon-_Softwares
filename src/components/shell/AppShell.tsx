import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileNav } from './MobileNav'
import { Footer } from './Footer'
import { WalletModal } from './WalletModal'
import { Toaster } from '@/components/ui/Toaster'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh]">
      <a href="#main" className="sr-only z-[200] rounded-lg bg-primary px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to content</a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main id="main" className="flex-1 pb-24 lg:pb-0">
          <div className="mx-auto w-full max-w-[1600px] px-3 py-5 sm:px-6 sm:py-7">{children}</div>
          <Footer />
        </main>
      </div>
      <MobileNav />
      <WalletModal />
      <Toaster />
    </div>
  )
}
