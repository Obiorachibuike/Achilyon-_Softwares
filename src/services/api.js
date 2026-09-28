import axios from 'axios'
import { config, CHAINS } from '../config.js'
import { chunk, dedupePairs, groupByChain } from '../lib/market.js'

const dex = axios.create({ baseURL: config.dexApiBase, timeout: 15000 })
const goplus = axios.create({ baseURL: config.goplusApiBase, timeout: 15000 })

const enc = encodeURIComponent

/** Run promises but never reject — failures resolve to `fallback`. */
async function settle(promises, fallback = []) {
  const results = await Promise.allSettled(promises)
  return results.map(r => (r.status === 'fulfilled' ? r.value : fallback))
}

export const dexService = {
  async search(query) {
    if (!query?.trim()) return []
    const { data } = await dex.get(`/latest/dex/search?q=${enc(query.trim())}`)
    return data?.pairs ?? []
  },

  /** One or more pairs on the same chain (max 30 addresses per call). */
  async getPairs(chainId, pairAddresses) {
    const addresses = [...new Set(pairAddresses)].filter(Boolean)
    if (!addresses.length) return []
    const batches = await settle(
      chunk(addresses, 30).map(async (batch) => {
        const { data } = await dex.get(`/latest/dex/pairs/${enc(chainId)}/${batch.map(enc).join(',')}`)
        return data?.pairs ?? (data?.pair ? [data.pair] : [])
      }),
    )
    return batches.flat()
  },

  async getPair(chainId, pairAddress) {
    const [pair] = await this.getPairs(chainId, [pairAddress])
    return pair ?? null
  },

  /** Live pairs for a heterogeneous list of `{ chainId, pairAddress }` refs. */
  async getPairsForRefs(refs) {
    const grouped = groupByChain(refs)
    const lists = await settle(
      Object.entries(grouped).map(([chainId, items]) => this.getPairs(chainId, items.map(i => i.pairAddress))),
    )
    return lists.flat()
  },

  /** Every pool for a token address across chains. */
  async getTokenPairs(tokenAddress) {
    const { data } = await dex.get(`/latest/dex/tokens/${enc(tokenAddress)}`)
    return data?.pairs ?? []
  },

  /** Pairs for up to 30 token addresses on one chain. */
  async getTokensOnChain(chainId, tokenAddresses) {
    const batches = await settle(
      chunk([...new Set(tokenAddresses)], 30).map(async (batch) => {
        const { data } = await dex.get(`/tokens/v1/${enc(chainId)}/${batch.map(enc).join(',')}`)
        return Array.isArray(data) ? data : data?.pairs ?? []
      }),
    )
    return batches.flat()
  },

  async getTopBoosts() {
    const { data } = await dex.get('/token-boosts/top/v1')
    return Array.isArray(data) ? data : data ? [data] : []
  },

  async getLatestProfiles() {
    const { data } = await dex.get('/token-profiles/latest/v1')
    return Array.isArray(data) ? data : data ? [data] : []
  },

  /**
   * Builds the market universe: seed searches + tokens with the most active boosts.
   * Only the best-liquidity pair per base token from boosts is kept to avoid noise.
   */
  async getMarketUniverse(queries = config.marketQueries) {
    const [searchLists, boosts] = await Promise.all([
      settle(queries.map(q => this.search(q))),
      this.getTopBoosts().catch(() => []),
    ])

    const boostedByChain = groupByChain(boosts.filter(b => b.chainId && b.tokenAddress).slice(0, 60))
    const boostedLists = await settle(
      Object.entries(boostedByChain).map(([chainId, items]) => this.getTokensOnChain(chainId, items.map(i => i.tokenAddress))),
    )
    const bestPerToken = new Map()
    for (const pair of boostedLists.flat()) {
      const key = `${pair.chainId}:${pair.baseToken?.address}`
      const current = bestPerToken.get(key)
      if (!current || (pair.liquidity?.usd ?? 0) > (current.liquidity?.usd ?? 0)) bestPerToken.set(key, pair)
    }

    const pairs = dedupePairs(...searchLists, [...bestPerToken.values()])
    if (!pairs.length && searchLists.every(l => !l.length)) {
      throw new Error('DexScreener did not return any data. Check your connection or try again shortly.')
    }
    return pairs
  },
}

const GOPLUS_CHAIN = Object.fromEntries(CHAINS.map(c => [c.id, c.goplus]))

export const securityService = {
  isSupported: (chainId) => Boolean(GOPLUS_CHAIN[chainId]),

  /** Returns the raw GoPlus token security record, or null if unavailable. */
  async getTokenSecurity(chainId, address) {
    const gp = GOPLUS_CHAIN[chainId]
    if (!gp || !address) return null
    const path = gp === 'solana'
      ? `/solana/token_security?contract_addresses=${enc(address)}`
      : `/token_security/${gp}?contract_addresses=${enc(address)}`
    const { data } = await goplus.get(path)
    if (data?.code !== 1 || !data.result) return null
    const result = data.result
    return result[address] ?? result[address.toLowerCase()] ?? Object.values(result)[0] ?? null
  },
}

/** Back-compat alias for the original service name. */
export const coinService = {
  getTrending: () => dexService.getMarketUniverse(),
  searchPairs: (q) => dexService.search(q),
}
