'use client'
import { useQuery } from '@tanstack/react-query'
import { Rocket } from 'lucide-react'
import { api, errorMessage } from '@/lib/api/client'
import { useWallet } from '@/stores/wallet'
import { useNow } from '@/hooks/useNow'
import { PageHeader, Skeleton } from '@/components/ui/primitives'
import { EmptyState, ErrorState } from '@/components/ui/feedback'
import { ButtonLink } from '@/components/ui/Button'
import { TokenCard } from '@/features/market/TokenCard'
import { RequireSession } from '@/features/portfolio/RequireSession'
import type { ProfileData } from './ProfileView'

export function MyTokensView() {
  return (
    <div className="space-y-5">
      <PageHeader title="My tokens" description="Tokens you launched on Achilyon." actions={<ButtonLink href="/launch" variant="primary" size="sm"><Rocket className="h-3.5 w-3.5" /> Launch a token</ButtonLink>} />
      <RequireSession purpose="see the tokens you launched"><MyTokensList /></RequireSession>
    </div>
  )
}

function MyTokensList() {
  const address = useWallet((s) => s.session?.address ?? '')
  const now = useNow(30_000)
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['profile', address.toLowerCase()], queryFn: () => api.get<ProfileData>(`/api/profile/${address}`), enabled: Boolean(address), refetchInterval: 20_000 })
  if (error && !data) return <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
  if (isLoading || !data) return <div className="grid gap-3 sm:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
  if (data.createdTokens.length === 0) return <EmptyState icon={<Rocket className="h-5 w-5" />} title="You haven't launched a token yet" description="Launch on a fair bonding curve in six guided steps." action={<ButtonLink href="/launch" variant="primary" size="sm">Start a launch</ButtonLink>} />
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{data.createdTokens.map((t) => <TokenCard key={t.token.address} token={t} now={now} variant="launch" />)}</div>
}
