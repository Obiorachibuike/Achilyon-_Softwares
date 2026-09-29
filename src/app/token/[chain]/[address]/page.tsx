import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { tokenRefSchema } from '@/lib/api/schemas'
import { isValidAddress } from '@/lib/blockchain/chains'
import { getToken } from '@/lib/blockchain/tokens'
import { getTokenPairs } from '@/lib/blockchain/pairs'
import { formatPrice, formatUsdCompact } from '@/lib/format'
import { tokenPath } from '@/lib/paths'
import { TokenView } from '@/features/token/TokenView'

type Props = { params: Promise<{ chain: string; address: string }> }

const load = cache(async (chain: string, rawAddress: string) => {
  const parsed = tokenRefSchema.safeParse({ chain, address: decodeURIComponent(rawAddress) })
  if (!parsed.success || !isValidAddress(parsed.data.chain, parsed.data.address)) return null
  const token = await getToken(parsed.data.chain, parsed.data.address).catch(() => null)
  if (!token) return null
  const pairs = await getTokenPairs(parsed.data.chain, parsed.data.address).catch(() => [token.pair])
  return { ref: parsed.data, token, pairs }
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { chain, address } = await params
  const data = await load(chain, address)
  if (!data) return { title: 'Token not found', robots: { index: false } }
  const { token: t } = data
  const title = `${t.token.symbol} / ${t.pair.quoteToken.symbol}`
  const description = `${t.token.name} (${t.token.symbol}) price ${formatPrice(t.market.priceUsd)}, market cap ${formatUsdCompact(t.market.marketCap)}, 24h volume ${formatUsdCompact(t.market.volume.h24)}. Live chart, trades and risk signals on Achilyon.${t.source === 'demo' ? ' (Demo data)' : ''}`
  const path = tokenPath(t.token.chain, t.token.address)
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} — Achilyon`, description, url: path, type: 'website' },
    twitter: { card: 'summary', title: `${title} — Achilyon`, description },
    robots: t.source === 'demo' ? { index: false, follow: true } : undefined,
  }
}

export default async function TokenPage({ params }: Props) {
  const { chain, address } = await params
  const data = await load(chain, address)
  if (!data) notFound()
  return <TokenView chain={data.ref.chain} address={data.ref.address} initial={{ token: data.token, pairs: data.pairs }} />
}
