'use client'
import { useEffect, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { MarketToken, MarketTrade } from '@/types'
import { useRealtimeStore } from '@/stores/realtime'
import { useNotifications } from '@/stores/notifications'
import { useWatchlistStore } from '@/stores/watchlist'
import { tokenPath } from '@/lib/paths'
import { formatPercent } from '@/lib/format'

/**
 * Real-time transport. SSE is the default because it works on serverless
 * deployments; the store/consumer contract is transport-independent and can
 * be backed by a dedicated WebSocket indexer later.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()

  useEffect(() => {
    if (typeof EventSource === 'undefined') {
      useRealtimeStore.getState().setStatus('polling')
      return
    }

    const { setStatus, applyPrice, pushTrade, pushLaunch } = useRealtimeStore.getState()
    let failures = 0
    let es: EventSource | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    const watchAnchors = new Map<string, { price: number; notifiedAt: number }>()
    let invalidateTimer: ReturnType<typeof setTimeout> | null = null

    const invalidateLists = () => {
      if (invalidateTimer) return
      invalidateTimer = setTimeout(() => {
        invalidateTimer = null
        void qc.invalidateQueries({ queryKey: ['tokens'] })
      }, 1000)
    }

    const parse = <T,>(e: Event): T | null => {
      try { return JSON.parse((e as MessageEvent<string>).data) as T } catch { return null }
    }

    const connect = () => {
      setStatus('connecting')
      es = new EventSource('/api/stream')

      es.addEventListener('hello', () => {
        failures = 0
        setStatus('live')
      })

      es.addEventListener('refresh', () => {
        invalidateLists()
      })

      es.addEventListener('provider-error', () => {
        setStatus('polling')
      })

      es.addEventListener('price', (e) => {
        const d = parse<{ key: string; priceUsd: number; change24h: number; marketCap: number; volume24h: number; progress: number | null }>(e)
        if (!d) return
        applyPrice(d.key, d)

        const watched = useWatchlistStore.getState().items.some(
          (i) => `${i.chain}:${i.address.toLowerCase()}` === d.key.toLowerCase(),
        )
        if (!watched) return

        const a = watchAnchors.get(d.key)
        if (!a) {
          watchAnchors.set(d.key, { price: d.priceUsd, notifiedAt: 0 })
          return
        }

        const move = (d.priceUsd / a.price - 1) * 100
        if (Math.abs(move) >= 10 && Date.now() - a.notifiedAt > 10 * 60_000) {
          const [chain, address] = d.key.split(':')
          useNotifications.getState().push({
            kind: 'watchlist',
            title: `Watchlist token ${move > 0 ? 'up' : 'down'} ${formatPercent(move)}`,
            body: 'Based on the live market feed.',
            href: chain && address ? `/token/${chain}/${address}` : undefined,
          })
          watchAnchors.set(d.key, { price: d.priceUsd, notifiedAt: Date.now() })
        }
      })

      es.addEventListener('trade', (e) => {
        const d = parse<{ key: string; trade: MarketTrade }>(e)
        if (d) pushTrade(d.key, d.trade)
      })

      es.addEventListener('token', (e) => {
        const d = parse<{ key: string; token: MarketToken }>(e)
        if (!d) return
        pushLaunch(d.token)
        useNotifications.getState().push({
          kind: 'launch',
          title: `New launch: ${d.token.token.symbol}`,
          body: `${d.token.token.name} started trading on its bonding curve.`,
          href: tokenPath(d.token.token.chain, d.token.token.address),
        })
        invalidateLists()
      })

      es.addEventListener('migrated', (e) => {
        const d = parse<{ key: string; symbol: string }>(e)
        if (!d) return
        const [chain, address] = d.key.split(':')
        useNotifications.getState().push({
          kind: 'system',
          title: `${d.symbol} completed its curve`,
          body: 'Liquidity migrated to a DEX pool.',
          href: chain && address ? `/token/${chain}/${address}` : undefined,
        })
        invalidateLists()
      })

      es.onerror = () => {
        failures += 1
        if (failures >= 3) {
          es?.close()
          setStatus('polling')
          retryTimer = setTimeout(() => {
            failures = 0
            connect()
          }, 15_000)
        }
      }
    }

    connect()

    const onVisibility = () => {
      if (document.hidden) {
        es?.close()
        setStatus('offline')
      } else if (!es || es.readyState === EventSource.CLOSED) {
        connect()
      }
    }

    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      es?.close()
      if (retryTimer) clearTimeout(retryTimer)
      if (invalidateTimer) clearTimeout(invalidateTimer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [qc])

  return <>{children}</>
}
