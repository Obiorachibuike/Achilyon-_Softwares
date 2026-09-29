'use client'
import type { ReactNode } from 'react'
import { Wallet, KeyRound } from 'lucide-react'
import { useWallet } from '@/stores/wallet'
import { useMounted } from '@/hooks/useMounted'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/feedback'
import { Skeleton } from '@/components/ui/primitives'

/** Gate for wallet-scoped pages: connect → sign in → content. */
export function RequireSession({ children, purpose }: { children: ReactNode; purpose: string }) {
  const mounted = useMounted()
  const { status, session, sessionLoaded, signingIn, openModal, ensureSession } = useWallet()
  if (!mounted || !sessionLoaded || status === 'connecting') return <Skeleton className="h-64 w-full rounded-2xl" />
  if (session) return <>{children}</>
  if (status !== 'connected') {
    return <EmptyState icon={<Wallet className="h-5 w-5" />} title="Connect a wallet" description={`Connect a wallet to ${purpose}. Try the demo wallet to explore with simulated funds.`} action={<Button variant="primary" onClick={openModal}>Connect wallet</Button>} />
  }
  return (
    <EmptyState
      icon={<KeyRound className="h-5 w-5" />}
      title="Sign in to continue"
      description="Sign a free message to prove you own this wallet. It costs no gas and grants no permissions."
      action={<Button variant="primary" loading={signingIn} onClick={() => void ensureSession()}>Sign in</Button>}
    />
  )
}
