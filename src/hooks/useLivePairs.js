import { useCallback, useEffect, useMemo, useState } from 'react'
import { dexService } from '../services/api'
import { config } from '../config'
import useVisibleInterval from './useVisibleInterval'
import useMarketStore from '../store/useMarketStore'

/**
 * Keeps a map of live pairs for a list of `{ chainId, pairAddress }` refs.
 * Returns { pairs: Map<key, pair>, loading, error, refresh, lastUpdated }.
 */
export default function useLivePairs(refs) {
  const signature = useMemo(
    // Keep original casing: Solana addresses are case-sensitive base58.
    () => [...new Set(refs.map((r) => `${r.chainId}:${r.pairAddress}`))].sort().join('|'),
    [refs],
  )
  const [state, setState] = useState({ pairs: new Map(), loading: false, error: null, lastUpdated: null })
  const upsertPairs = useMarketStore((s) => s.upsertPairs)

  const refresh = useCallback(async () => {
    if (!signature) { setState((s) => ({ ...s, pairs: new Map(), loading: false })); return }
    const list = signature.split('|').map((k) => { const [chainId, pairAddress] = k.split(':'); return { chainId, pairAddress } })
    setState((s) => ({ ...s, loading: true }))
    try {
      const pairs = await dexService.getPairsForRefs(list)
      upsertPairs(pairs)
      setState({
        pairs: new Map(pairs.map((p) => [`${p.chainId}:${p.pairAddress}`.toLowerCase(), p])),
        loading: false,
        error: null,
        lastUpdated: Date.now(),
      })
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err?.message || 'Failed to load live prices' }))
    }
  }, [signature, upsertPairs])

  useEffect(() => { refresh() }, [refresh])
  useVisibleInterval(refresh, config.refreshIntervalMs)

  return { ...state, refresh }
}
