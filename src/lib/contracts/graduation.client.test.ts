import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { parseEther, type Address, type PublicClient } from 'viem'
import { buyToken, createLaunchpadClient, graduateToken, launchToken, readCurve, readPoolAddress, readPoolReserves } from './launchpad'
import { curveSnapshot, toUnits } from './curveMath'
import { onchainQuote } from './tradeQuote'
import { readLaunchedToken } from './reader'
import { contractErrorMessage, isUserRejection } from './errors'
import { runTx } from '@/lib/transactions/runTx'
import { INITIAL_TX_STATE, txReducer, type TxEvent, type TxState } from '@/lib/transactions/stateMachine'
import { deployWithUniswap, startChain, type TestChain } from '@/test/evm'
import type { LaunchpadDeployment } from './deployments'

const USD = 3000
let chain: TestChain
let d: LaunchpadDeployment
let alice: Address, bob: Address, carol: Address
let token: Address
let pc: PublicClient

async function track<T extends { hash: string }>(fn: Parameters<typeof runTx<T>>[1]) {
  const events: TxEvent['type'][] = []
  let state: TxState = INITIAL_TX_STATE
  const result = await runTx<T>((e) => { events.push(e.type); state = txReducer(state, e) }, fn, { isRejection: isUserRejection, message: contractErrorMessage })
  return { result, events, state }
}
const deadline = async () => (await chain.now()) + 600n

beforeAll(async () => {
  chain = await startChain()
  ;[, alice, bob, carol] = chain.accounts as [Address, Address, Address, Address]
  d = (await deployWithUniswap(chain)).deployment
  pc = chain.publicClient as PublicClient
  const c = createLaunchpadClient(chain.provider, d, alice)
  token = (await launchToken(c, { name: 'Graduate', symbol: 'GRAD', metadataURI: '', totalSupply: parseEther('1000000000'), curveBps: 8000, creatorBps: 0, initialBuy: 0n, minTokensOut: 0n, deadline: await deadline() })).token
})
afterAll(() => chain?.close())

describe('graduation through the client', () => {
  it('refuses to graduate an incomplete curve without prompting the wallet', async () => {
    const { events, state } = await track((hooks) => graduateToken(createLaunchpadClient(chain.provider, d, bob), token, hooks))
    expect(events).toEqual(['START', 'FAILED'])
    expect(state.error).toMatch(/not completed/)
  })

  it('completes the curve, closes curve trading and graduates via the tx state machine', async () => {
    const c = createLaunchpadClient(chain.provider, d, carol)
    await buyToken(c, { token, quoteIn: parseEther('10'), minTokensOut: 0n, deadline: await deadline() })
    const before = (await readCurve(pc, d.address, token))!
    expect(before.complete).toBe(true)
    expect(onchainQuote(before, 'buy', 1n, 100)).toEqual({ problem: 'complete' })
    const snapBefore = curveSnapshot(before, parseEther('1000000000'), 'ETH', USD)

    const { result, events, state } = await track((hooks) => graduateToken(createLaunchpadClient(chain.provider, d, bob), token, hooks))
    expect(events).toEqual(['START', 'REQUEST_SIGNATURE', 'SUBMITTED', 'CONFIRMED'])
    expect(state.phase).toBe('confirmed')
    expect(result!.pool).toBe(await readPoolAddress(pc, token))
    expect(result!.quoteAmount).toBe(before.realQuoteReserve)

    // The snapshot survives migration zeroing the curve's real reserve.
    const after = (await readCurve(pc, d.address, token))!
    const snapAfter = curveSnapshot(after, parseEther('1000000000'), 'ETH', USD)
    expect(snapAfter.progress).toBe(1)
    expect(snapAfter.quoteRaised).toBeCloseTo(snapBefore.quoteRaised, 12)
    expect(snapAfter.migrationQuoteTarget).toBeCloseTo(snapBefore.migrationQuoteTarget, 12)
    expect(snapAfter.virtualQuoteReserve).toBeCloseTo(snapBefore.virtualQuoteReserve, 12)

    const again = await track((hooks) => graduateToken(createLaunchpadClient(chain.provider, d, bob), token, hooks))
    expect(again.state.error).toMatch(/already migrated/i)
  })

  it('reads a graduated token from its pool: price, liquidity, venue and status', async () => {
    const res = (await readLaunchedToken(pc, d, token, USD))!
    const pool = await readPoolAddress(pc, token)
    const reserves = (await readPoolReserves(pc, pool, token))!
    expect(res.pool).toMatchObject({ address: pool, ...reserves })
    const t = res.token
    expect(t.token.status).toBe('migrated')
    expect(t.pair).toMatchObject({ address: pool, dexId: 'uniswap-v2', dexName: 'Uniswap V2' })
    const price = toUnits(reserves.quoteReserve) / toUnits(reserves.tokenReserve)
    expect(t.market.priceUsd).toBeCloseTo(price * USD, 15)
    expect(t.market.liquidityUsd).toBeCloseTo(2 * toUnits(reserves.quoteReserve) * USD, 6)
    expect(t.pair.priceNative).toBeCloseTo(price, 18)
    expect(t.curve?.migrated).toBe(true)
    // Curve history is kept for the chart and activity feed.
    expect(res.trades.length).toBeGreaterThan(0)
  })
})
