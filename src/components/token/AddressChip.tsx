import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import type { ChainId, DataSource } from '@/types'
import { shortAddress } from '@/lib/format'
import { explorerAddressUrl, explorerName, explorerTxUrl } from '@/lib/blockchain/explorers'
import { cn } from '@/lib/cn'
import { CopyButton } from './CopyButton'

/** Shortened address/hash with copy button and (for live data) explorer link. */
export function AddressChip({ value, chain, kind = 'address', source = 'live', href, className, label }: {
  value: string
  chain: ChainId
  kind?: 'address' | 'tx'
  source?: DataSource
  href?: string
  className?: string
  label?: string
}) {
  const explorer = kind === 'tx' ? explorerTxUrl(chain, value, source) : explorerAddressUrl(chain, value, source)
  const text = <span className="font-mono text-[12px]" title={value}>{shortAddress(value)}</span>
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-muted', className)}>
      {href ? <Link href={href} className="hover:text-fg hover:underline">{text}</Link> : text}
      <CopyButton value={value} label={`Copy ${label ?? (kind === 'tx' ? 'transaction hash' : 'address')}`} />
      {explorer && (
        <a href={explorer} target="_blank" rel="noopener noreferrer nofollow" className="rounded-md p-1 text-subtle hover:bg-white/5 hover:text-fg" aria-label={`View on ${explorerName(chain)}`} title={`View on ${explorerName(chain)}`}>
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </span>
  )
}
