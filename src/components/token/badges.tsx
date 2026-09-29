import { BadgeCheck, Flame, Rocket, ShieldQuestion } from 'lucide-react'
import type { ChainId, TokenStatus } from '@/types'
import { NETWORKS } from '@/lib/blockchain/chains'
import { Badge } from '@/components/ui/primitives'
import { Tooltip } from '@/components/ui/Tooltip'
import type { RiskLevel } from '@/lib/market/risk'

export function ChainDot({ chain, className }: { chain: ChainId; className?: string }) {
  return <span aria-hidden className={className} style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 999, background: NETWORKS[chain].color }} />
}

export function ChainBadge({ chain }: { chain: ChainId }) {
  return (
    <Badge>
      <ChainDot chain={chain} /> {NETWORKS[chain].shortName}
    </Badge>
  )
}

export function VerifiedMark({ verified, size = 14 }: { verified: boolean; size?: number }) {
  return verified ? (
    <Tooltip content="Verified by Achilyon moderators. Verification is not an endorsement.">
      <BadgeCheck className="text-primary" style={{ width: size, height: size }} aria-label="Verified" />
    </Tooltip>
  ) : (
    <Tooltip content="Unverified — Achilyon has not reviewed this token. Do your own research.">
      <ShieldQuestion className="text-subtle" style={{ width: size, height: size }} aria-label="Unverified" />
    </Tooltip>
  )
}

export function StatusBadge({ status }: { status: TokenStatus }) {
  if (status === 'bonding') return <Badge tone="gold"><Flame className="h-3 w-3" aria-hidden /> Curve</Badge>
  if (status === 'migrated') return <Badge tone="primary"><Rocket className="h-3 w-3" aria-hidden /> Graduated</Badge>
  return null
}

export function RiskBadge({ level }: { level: RiskLevel | 'low' }) {
  if (level === 'danger') return <Badge tone="down">High risk</Badge>
  if (level === 'warn') return <Badge tone="warn">Caution</Badge>
  if (level === 'info') return <Badge tone="neutral">Some risk</Badge>
  return <Badge tone="up" title="No market-structure warnings detected. This does not mean the token is safe.">Fewer flags</Badge>
}
