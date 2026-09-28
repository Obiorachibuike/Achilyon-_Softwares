import { AGE_OPTIONS, LIQUIDITY_OPTIONS } from '../config.js'
import { calculateTrendingScore } from './trending.js'
import { toNumber } from './utils.js'

export const pairKey = (pair) => `${pair.chainId}:${pair.pairAddress}`.toLowerCase()

export const pairPath = (pair) => `/token/${pair.chainId}/${pair.pairAddress}`

/** Flattened numeric view of a DexScreener pair — used for sorting, filtering and stats. */
export function metrics(pair) {
  return {
    price: toNumber(pair.priceUsd, null),
    liquidity: toNumber(pair.liquidity?.usd),
    volume24h: toNumber(pair.volume?.h24),
    volume1h: toNumber(pair.volume?.h1),
    change5m: toNumber(pair.priceChange?.m5),
    change1h: toNumber(pair.priceChange?.h1),
    change6h: toNumber(pair.priceChange?.h6),
    change24h: toNumber(pair.priceChange?.h24),
    fdv: toNumber(pair.fdv),
    marketCap: toNumber(pair.marketCap ?? pair.fdv),
    buys24h: toNumber(pair.txns?.h24?.buys),
    sells24h: toNumber(pair.txns?.h24?.sells),
    createdAt: pair.pairCreatedAt ?? null,
    score: calculateTrendingScore(pair),
  }
}

/** Merge pair lists, de-duplicating by chain + pair address (later lists win). */
export function dedupePairs(...lists) {
  const map = new Map()
  for (const list of lists) {
    for (const pair of list ?? []) {
      if (pair?.pairAddress && pair?.chainId && pair?.baseToken) map.set(pairKey(pair), pair)
    }
  }
  return [...map.values()]
}

export function matchesQuery(pair, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [
    pair.baseToken?.symbol,
    pair.baseToken?.name,
    pair.baseToken?.address,
    pair.quoteToken?.symbol,
    pair.pairAddress,
    pair.dexId,
    pair.chainId,
  ].some(v => v && String(v).toLowerCase().includes(q))
}

export function filterPairs(pairs, { query = '', chain = 'all', age = 'any', liquidity = 'any' } = {}, now = Date.now()) {
  const maxHours = AGE_OPTIONS.find(a => a.id === age)?.hours ?? null
  const minLiq = LIQUIDITY_OPTIONS.find(l => l.id === liquidity)?.min ?? 0
  return pairs.filter(pair => {
    if (chain !== 'all' && pair.chainId !== chain) return false
    if (minLiq && toNumber(pair.liquidity?.usd) < minLiq) return false
    if (maxHours !== null) {
      if (!pair.pairCreatedAt) return false
      if ((now - pair.pairCreatedAt) / 3_600_000 > maxHours) return false
    }
    return matchesQuery(pair, query)
  })
}

export function marketStats(pairs, now = Date.now()) {
  const list = pairs.map(metrics)
  const volume = list.reduce((s, m) => s + m.volume24h, 0)
  const liquidity = list.reduce((s, m) => s + m.liquidity, 0)
  const fresh = list.filter(m => m.createdAt && now - m.createdAt < 86_400_000).length
  const gainers = list.filter(m => m.change24h > 0).length
  const withChange = list.filter(m => m.change24h !== 0 || m.volume24h > 0)
  const breadth = withChange.length ? Math.round((gainers / withChange.length) * 100) : 0
  const buys = list.reduce((s, m) => s + m.buys24h, 0)
  const sells = list.reduce((s, m) => s + m.sells24h, 0)
  return { count: pairs.length, volume, liquidity, fresh, breadth, buys, sells }
}

export function topMovers(pairs, { direction = 'up', limit = 5, minLiquidity = 10_000 } = {}) {
  return pairs
    .filter(p => toNumber(p.liquidity?.usd) >= minLiquidity)
    .sort((a, b) => {
      const d = toNumber(b.priceChange?.h24) - toNumber(a.priceChange?.h24)
      return direction === 'up' ? d : -d
    })
    .slice(0, limit)
}

export function groupByChain(items) {
  return items.reduce((acc, item) => {
    if (!acc[item.chainId]) acc[item.chainId] = []
    acc[item.chainId].push(item)
    return acc
  }, {})
}

export function chunk(list, size) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

export function dexScreenerEmbedUrl(chainId, pairAddress, theme = 'dark') {
  const params = new URLSearchParams({
    embed: '1',
    loadChartSettings: '0',
    trades: '0',
    tabs: '0',
    info: '0',
    chartLeftToolbar: '0',
    chartTheme: theme,
    theme,
    chartStyle: '1',
    chartType: 'usd',
    interval: '15',
  })
  return `https://dexscreener.com/${chainId}/${pairAddress}?${params}`
}
