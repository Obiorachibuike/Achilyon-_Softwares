import type { MarketToken } from '@/types'
import { curveAt, defaultCurveConfig, toSnapshot } from '@/lib/bondingCurve'

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

let seq = 0

/** Builds a realistic listed MarketToken; override any nested field. */
export function makeToken(o: DeepPartial<MarketToken> = {}): MarketToken {
  seq += 1
  const address = o.token?.address ?? `0x${seq.toString(16).padStart(40, '0')}`
  const base: MarketToken = {
    token: {
      chain: 'base', address, name: `Token ${seq}`, symbol: `TK${seq}`, decimals: 18, logoUrl: null, description: 'A test token',
      socials: { website: 'https://example.com' }, creator: '0x1111111111111111111111111111111111111111', createdAt: Date.now() - 48 * 3_600_000,
      totalSupply: 1_000_000_000, verified: false, status: 'listed', launchpad: false,
    },
    market: {
      priceUsd: 0.01, priceChange: { m5: 0, h1: 1, h6: 2, h24: 5 }, volume: { h1: 10_000, h6: 60_000, h24: 240_000 },
      liquidityUsd: 200_000, marketCap: 10_000_000, fdv: 10_000_000, txns: { h1: { buys: 30, sells: 20 }, h24: { buys: 600, sells: 400 } },
      holders: 1200, updatedAt: Date.now(),
    },
    pair: {
      chain: 'base', address: `0x${(seq + 5000).toString(16).padStart(40, '0')}`, dexId: 'uniswap', dexName: 'Uniswap',
      baseToken: { address, symbol: `TK${seq}`, name: `Token ${seq}` }, quoteToken: { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', name: 'Wrapped Ether' },
      priceUsd: 0.01, priceNative: 0.000003, liquidityUsd: 200_000, volume24h: 240_000, txns24h: { buys: 600, sells: 400 }, priceChange24h: 5,
      createdAt: Date.now() - 48 * 3_600_000, source: 'demo',
    },
    curve: null,
    social: { comments: 10, watchers: 50 },
    source: 'demo',
  }
  return {
    ...base,
    ...o,
    token: { ...base.token, ...o.token, socials: { ...base.token.socials, ...o.token?.socials } },
    market: {
      ...base.market, ...o.market,
      priceChange: { ...base.market.priceChange, ...o.market?.priceChange },
      volume: { ...base.market.volume, ...o.market?.volume },
      txns: { h1: { ...base.market.txns.h1, ...o.market?.txns?.h1 }, h24: { ...base.market.txns.h24, ...o.market?.txns?.h24 } },
    },
    pair: { ...base.pair, ...o.pair, baseToken: { ...base.pair.baseToken, ...o.pair?.baseToken }, quoteToken: { ...base.pair.quoteToken, ...o.pair?.quoteToken }, txns24h: { ...base.pair.txns24h, ...o.pair?.txns24h } },
    social: { ...base.social, ...o.social },
  } as MarketToken
}

/** A launchpad token sitting on its bonding curve with `sold` tokens sold. */
export function makeCurveToken(sold = 100_000_000): MarketToken {
  const config = defaultCurveConfig('ETH', 3200)
  const state = curveAt(config, sold)
  return makeToken({ token: { status: 'bonding', launchpad: true }, curve: toSnapshot(state), market: { liquidityUsd: state.quoteRaised * 3200 } })
}
