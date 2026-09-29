'use client'
import type { ReactNode } from 'react'
import { QueryProvider } from './QueryProvider'
import { WalletProvider } from './WalletProvider'
import { RealtimeProvider } from './RealtimeProvider'
import { AlertMonitor } from './AlertMonitor'
import { ServiceWorker } from './ServiceWorker'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <WalletProvider>
        <RealtimeProvider>
          {children}
          <AlertMonitor />
          <ServiceWorker />
        </RealtimeProvider>
      </WalletProvider>
    </QueryProvider>
  )
}
