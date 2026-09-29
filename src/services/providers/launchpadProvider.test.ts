import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { parseEther, type Address, type PublicClient } from 'viem'
import type { MarketToken } from '@/types'
import { createLaunchpadClient, launchToken, buyToken, sellToken, readCurve } from '@/lib/contracts/launchpad'
import { encodeMetadata } from '@/lib/contracts/metadata'
import { spotPriceQuote } from '@/lib/contracts/curveMath'
import { scanLaunches, scanTrades } from '@/lib/contracts/reader'
import type { LaunchpadDeployment } from '@/lib/contracts/deployments'
import { deployLaunchpad, startChain, START_MCAP, type TestChain } from '@/test/evm'
import { launchpadWalletActivity, setLaunchpadRuntime, withLaunchpad } from './launchpadProvider'
import type { MarketDataProvider } from './types'

const USD = 2000
let chain: TestChain
let d: LaunchpadDeployment
let alice: Address, bob: Address, carol: Address
let first: Address, second: Address
let pc: PublicClient

const sentinel = { token: { symbol: 'BASE' } } as MarketToken
const base: MarketDataProvider = {
  id: 'stub', source: 'demo',
  listTokens: async () => [sentinel], getToken: async () => sentinel, getTokenPairs: async () => [], getPair: async () => sentinel,
  search: async () => [sentinel], getCandles: async () => [], getTrades: async () => [],
}
const provider = withLaunchpad(base)

beforeAll(async () => {
  chain = await startChain()
  ;[, alice, bob, carol] = chain.accounts as [Address, Address, Address, Address]
  d = (await deployLaunchpad(chain)).deployment
  pc = chain.publicClient as PublicClient
  setLaunchpadRuntime({ deployments: () => [d], client: () => pc, quoteUsd: async () => ({ usd: USD, live: false }) })

  const deadline = async () => (await chain.now()) + 600n
  const params = async (symbol: string, description: string) => ({
    name: `${symbol} Token`, symbol, metadataURI: encodeMetadata({ description, website: 'https://example.org' }),
    totalSupply: parseEther('1000000000'), curveBps: 8000, creatorBps: 0, initialBuy: 0n, minTokensOut: 0n, deadline: await deadline(),
  })
  first = (await launchToken(createLaunchpadClient(chain.provider, d, alice), await params('ONE', 'The first launch'))).token
  await chain.increaseTime(120)
  second = (await launchToken(createLaunchpadClient(chain.provider, d, carol), await params('TWO', 'The second launch'))).token

  const b = createLaunchpadClient(chain.provider, d, bob)
  await buyToken(b, { token: first, quoteIn: parseEther('0.5'), minTokensOut: 0n, deadline: await deadline() })
  await chain.increaseTime(90)
  const bought = await buyToken(b, { token: first, quoteIn: parseEther('0.25'), minTokensOut: 0n, deadline: await deadline() })
  await chain.increaseTime(30)
  await sellToken(b, { token: first, amount: bought.tokenAmount / 2n, minQuoteOut: 0n, deadline: await deadline() })
  await buyToken(createLaunchpadClient(chain.provider, d, carol), { token: second, quoteIn: parseEther('0.1'), minTokensOut: 0n, deadline: await deadline() })
})
afterAll(() => {
  setLaunchpadRuntime(null)
  chain?.close()
})

describe('launchpad market provider', () => {
  it('lists on-chain launches newest first, ahead of the base provider', async () => {
    const list = await provider.listTokens()
    expect(list.map((t) => t.token.symbol)).toEqual(['TWO', 'ONE', 'BASE'])
    const one = list[1]!
    expect(one.source).toBe('live')
    expect(one.token).toMatchObject({ chain: d.chain, address: first, creator: alice, launchpad: true, status: 'bonding', description: 'The first launch', totalSupply: 1e9 })
    expect(one.token.socials.website).toBe('https://example.org/')
    expect(one.pair).toMatchObject({ dexId: 'achilyon', address: first })
    expect(one.market.holders).toBeNull()
    expect(one.market.txns.h24).toEqual({ buys: 2, sells: 1 })
  })

  it('prices tokens from the live curve', async () => {
    const t = (await provider.getToken(d.chain, first))!
    const curve = (await readCurve(pc, d.address, first))!
    expect(t.market.priceUsd).toBeCloseTo(spotPriceQuote(curve) * USD, 12)
    expect(t.market.marketCap).toBeCloseTo(t.market.priceUsd * 1e9, 3)
    expect(t.market.liquidityUsd).toBeCloseTo((Number(curve.realQuoteReserve) / 1e18) * USD, 6)
    expect(t.market.priceChange.h24).toBeGreaterThan(0)
    expect(t.curve!.progress).toBeGreaterThan(0)
  })

  it('falls back to the base provider for unknown tokens', async () => {
    expect(await provider.getToken(d.chain, '0x000000000000000000000000000000000000dEaD')).toBe(sentinel)
    expect(await provider.getToken('ethereum', first)).toBe(sentinel)
  })

  it('serves trades newest first from contract logs', async () => {
    const t = (await provider.getToken(d.chain, first))!
    const trades = await provider.getTrades(t, 10)
    expect(trades.map((x) => x.side)).toEqual(['sell', 'buy', 'buy'])
    expect(trades.every((x) => x.wallet === bob && x.status === 'confirmed' && x.source === 'live')).toBe(true)
    expect(trades[2]!.amountUsd).toBeCloseTo(0.5 * USD, 9)
    expect(await provider.getTrades(t, 1)).toHaveLength(1)
  })

  it('builds continuous candles that start at the launch price and end at spot', async () => {
    const t = (await provider.getToken(d.chain, first))!
    const candles = await provider.getCandles(t, '1m')
    expect(candles.length).toBeGreaterThanOrEqual(2)
    const launchPriceUsd = (Number(START_MCAP) / 1e18 / 1e9) * USD
    expect(candles[0]!.open).toBeCloseTo(launchPriceUsd, 15)
    for (let i = 1; i < candles.length; i++) {
      expect(candles[i]!.open).toBe(candles[i - 1]!.close)
      expect(candles[i]!.time).toBeGreaterThan(candles[i - 1]!.time)
    }
    for (const c of candles) expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close))
    expect(candles.at(-1)!.close).toBeCloseTo(t.market.priceUsd, 15)
  })

  it('lists a real wallet’s launchpad trades', async () => {
    const acts = await launchpadWalletActivity(bob)
    expect(acts.map((a) => a.type)).toEqual(['sell', 'buy', 'buy'])
    expect(acts.every((a) => a.symbol === 'ONE')).toBe(true)
    expect(await launchpadWalletActivity(alice)).toEqual([])
    expect(await launchpadWalletActivity('not-an-address')).toEqual([])
  })

  it('scans logs in small chunks with identical results and reports a capped window', async () => {
    const full = await scanLaunches(pc, d)
    const chunked = await scanLaunches(pc, d, { chunk: 2n })
    expect(chunked.launches).toEqual(full.launches)
    expect(full.partial).toBe(false)
    expect(await scanTrades(pc, d, {}, { chunk: 3n })).toEqual(await scanTrades(pc, d))
    const head = await pc.getBlockNumber()
    const windowed = await scanLaunches(pc, d, { maxBlocks: 1n })
    expect(windowed.partial).toBe(d.startBlock < head - 1n)
    expect(windowed.launches).toHaveLength(0)
  })
})
