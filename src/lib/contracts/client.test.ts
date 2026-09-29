import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { parseEther, type Address } from 'viem'
import { buyToken, createLaunchpadClient, deadlineIn, ensureChain, launchToken, quoteBuy, quoteSell, readBalances, readCurve, sellToken, type Eip1193 } from './launchpad'
import { contractErrorMessage, isUserRejection, WrongNetworkError } from './errors'
import { decodeMetadata, encodeMetadata } from './metadata'
import { curveSnapshot, parseUnitsSafe, quoteBuyExact, toUnits } from './curveMath'
import { parseDeployments, type LaunchpadDeployment } from './deployments'
import { runTx } from '@/lib/transactions/runTx'
import { INITIAL_TX_STATE, txReducer, type TxEvent, type TxState } from '@/lib/transactions/stateMachine'
import { deployLaunchpad, startChain, type TestChain } from '@/test/evm'

let chain: TestChain
let deployment: LaunchpadDeployment
let alice: Address, bob: Address

beforeAll(async () => {
  chain = await startChain()
  ;[, alice, bob] = chain.accounts as [Address, Address, Address]
  deployment = (await deployLaunchpad(chain)).deployment
})
afterAll(() => chain?.close())

/** Runs a client call through runTx, recording every state-machine event like the UI does. */
async function track<T extends { hash: string }>(fn: Parameters<typeof runTx<T>>[1]) {
  const events: TxEvent['type'][] = []
  let state: TxState = INITIAL_TX_STATE
  const result = await runTx<T>((e) => { events.push(e.type); state = txReducer(state, e) }, fn, { isRejection: isUserRejection, message: contractErrorMessage })
  return { result, events, state }
}

const launchParams = async (o: Partial<Parameters<typeof launchToken>[1]> = {}) => ({
  name: 'Client Test', symbol: 'CLNT', metadataURI: encodeMetadata({ description: 'Launched from the client test', website: 'https://achilyon.app' }),
  totalSupply: parseEther('1000000000'), curveBps: 8000, creatorBps: 0, initialBuy: 0n, minTokensOut: 0n, deadline: (await chain.now()) + 600n, ...o,
})

describe('launchpad client', () => {
  it('launches a token and reports each tx phase, confirming only after the receipt', async () => {
    const c = createLaunchpadClient(chain.provider, deployment, alice)
    const p = await launchParams()
    const { result, events, state } = await track((hooks) => launchToken(c, p, hooks))
    expect(events).toEqual(['START', 'REQUEST_SIGNATURE', 'SUBMITTED', 'CONFIRMED'])
    expect(state.phase).toBe('confirmed')
    expect(state.simulated).toBe(false)
    expect(state.hash).toMatch(/^0x[0-9a-f]{64}$/)
    const curve = await readCurve(c.publicClient, deployment.address, result!.token)
    expect(curve?.creator).toBe(alice)
  })

  it('launch with an initial buy returns the tokens bought', async () => {
    const c = createLaunchpadClient(chain.provider, deployment, alice)
    const { result } = await track(async (hooks) => launchToken(c, await launchParams({ initialBuy: parseEther('0.2'), symbol: 'INIT' }), hooks))
    expect(result!.tokensBought).toBeGreaterThan(0n)
    expect((await readBalances(c.publicClient, result!.token, alice)).token).toBe(result!.tokensBought)
  })

  it('buys with exact quotes and sells via permit in a single transaction', async () => {
    const creator = createLaunchpadClient(chain.provider, deployment, alice)
    const token = (await launchToken(creator, await launchParams({ symbol: 'TRD' }))).token
    const c = createLaunchpadClient(chain.provider, deployment, bob)

    const quoteIn = parseEther('0.75')
    const q = await quoteBuy(c.publicClient, deployment.address, token, quoteIn)
    const curve = await readCurve(c.publicClient, deployment.address, token)
    expect(q.tokensOut).toBe(quoteBuyExact(curve!, quoteIn).tokensOut)
    const dl = deadlineIn(600, Number((await chain.now()) * 1000n))
    const buy = await track((hooks) => buyToken(c, { token, quoteIn, minTokensOut: q.tokensOut, deadline: dl }, hooks))
    expect(buy.state.phase).toBe('confirmed')
    expect(buy.result!.tokenAmount).toBe(q.tokensOut)

    const amount = q.tokensOut / 3n
    const sq = await quoteSell(c.publicClient, deployment.address, token, amount)
    const nonceBefore = await chain.publicClient.getTransactionCount({ address: bob })
    const sell = await track(async (hooks) => sellToken(c, { token, amount, minQuoteOut: sq.quoteOut, deadline: (await chain.now()) + 600n }, hooks))
    expect(sell.events).toEqual(['START', 'REQUEST_SIGNATURE', 'SUBMITTED', 'CONFIRMED'])
    expect(sell.result!.quoteAmount).toBe(sq.quoteOut)
    // Permit path: exactly one on-chain transaction for the sale (no approve tx).
    expect(await chain.publicClient.getTransactionCount({ address: bob })).toBe(nonceBefore + 1)
  })

  it('fails before prompting the wallet when the contract would revert', async () => {
    const creator = createLaunchpadClient(chain.provider, deployment, alice)
    const token = (await launchToken(creator, await launchParams({ symbol: 'SLIP' }))).token
    const c = createLaunchpadClient(chain.provider, deployment, bob)
    const q = await quoteBuy(c.publicClient, deployment.address, token, parseEther('0.1'))
    const { events, state } = await track(async (hooks) => buyToken(c, { token, quoteIn: parseEther('0.1'), minTokensOut: q.tokensOut + 1n, deadline: (await chain.now()) + 600n }, hooks))
    expect(events).toEqual(['START', 'FAILED'])
    expect(state.error).toMatch(/slippage/i)

    const sell = await track(async (hooks) => sellToken(c, { token, amount: 1n, minQuoteOut: 0n, deadline: (await chain.now()) + 600n }, hooks))
    expect(sell.state.phase).toBe('failed')
    expect(sell.state.error).toMatch(/Insufficient token balance/)
  })

  it('maps a wallet rejection to REJECTED and never reaches confirmed', async () => {
    const rejecting: Eip1193 = {
      request: (a) => (a.method === 'eth_sendTransaction' ? Promise.reject(Object.assign(new Error('User rejected the request.'), { code: 4001 })) : chain.provider.request(a)),
    }
    const c = createLaunchpadClient(rejecting, deployment, alice)
    const { events, state, result } = await track(async (hooks) => launchToken(c, await launchParams({ symbol: 'REJ' }), hooks))
    expect(events).toEqual(['START', 'REQUEST_SIGNATURE', 'REJECTED'])
    expect(state.phase).toBe('rejected')
    expect(result).toBeNull()
  })

  it('switches the wallet to the deployment chain, or explains when it cannot', async () => {
    let chainId = '0x1'
    const switching: Eip1193 = { request: async (a) => {
      if (a.method === 'eth_chainId') return chainId
      if (a.method === 'wallet_switchEthereumChain') { chainId = (a.params as [{ chainId: string }])[0].chainId; return null }
      return chain.provider.request(a)
    } }
    await ensureChain(switching, 31337)
    expect(chainId).toBe('0x7a69')

    const stuck: Eip1193 = { request: async (a) => {
      if (a.method === 'eth_chainId') return '0x1'
      if (a.method === 'wallet_switchEthereumChain') throw Object.assign(new Error('Unrecognized chain'), { code: 4902 })
      return null
    } }
    await expect(ensureChain(stuck, 31337)).rejects.toBeInstanceOf(WrongNetworkError)
  })

  it('produces a display snapshot consistent with on-chain state', async () => {
    const c = createLaunchpadClient(chain.provider, deployment, alice)
    const { token } = await launchToken(c, await launchParams({ symbol: 'SNAP', initialBuy: parseEther('1') }))
    const curve = (await readCurve(c.publicClient, deployment.address, token))!
    const snap = curveSnapshot(curve, parseEther('1000000000'), 'ETH', 3200)
    expect(snap.totalSupply).toBe(1_000_000_000)
    expect(snap.curveSupply).toBe(800_000_000)
    expect(snap.virtualTokenReserve).toBeCloseTo(1_080_000_000, 3)
    expect(snap.virtualQuoteReserve).toBeCloseTo(1.6875, 12)
    expect(snap.quoteRaised).toBeCloseTo(0.99, 6)
    expect(snap.progress).toBeGreaterThan(0)
    // Graduates after vQ₀·vT₀/(vT₀ − curveSupply) − vQ₀ ≈ 4.82 ETH raised (≈ $74K market cap at $3,200).
    expect(snap.migrationQuoteTarget).toBeCloseTo(1.6875 * 1.08 / 0.28 - 1.6875, 9)
  })
})


describe('metadata, units and deployment config', () => {
  it('round-trips metadata and sanitizes untrusted payloads', () => {
    const uri = encodeMetadata({ description: 'Hello 👋 world', website: 'https://a.io', twitter: 'https://x.com/a' })
    expect(decodeMetadata(uri)).toEqual({ description: 'Hello 👋 world', website: 'https://a.io/', twitter: 'https://x.com/a' })
    const evil = 'data:application/json;base64,' + Buffer.from(JSON.stringify({ v: 1, description: 'x\u202Ey', website: 'javascript:alert(1)', discord: 'http://insecure.io' })).toString('base64')
    expect(decodeMetadata(evil)).toEqual({ description: 'xy' })
    expect(decodeMetadata('data:application/json;base64,!!!')).toEqual({})
    expect(decodeMetadata('https://example.com/meta.json')).toEqual({})
    expect(() => encodeMetadata({ description: 'x'.repeat(2000) })).toThrow(/too large/)
  })

  it('parses decimal input without float error', () => {
    expect(parseUnitsSafe('0.1')).toBe(100_000_000_000_000_000n)
    expect(parseUnitsSafe('1.000000000000000001')).toBe(1_000_000_000_000_000_001n)
    expect(parseUnitsSafe('.5')).toBe(500_000_000_000_000_000n)
    expect(parseUnitsSafe('1.2.3')).toBeNull()
    expect(parseUnitsSafe('0.0000000000000000001')).toBeNull()
    expect(parseUnitsSafe('')).toBeNull()
    expect(toUnits(1_500_000_000_000_000_000n)).toBe(1.5)
  })

  it('validates the deployments env var and ignores bad entries', () => {
    const d = parseDeployments(JSON.stringify({
      base: { address: '0x1111111111111111111111111111111111111111', startBlock: 5 },
      ethereum: { address: '0x2222222222222222222222222222222222222222', evmChainId: 11155111, testnet: true, explorerUrl: 'https://sepolia.etherscan.io' },
      solana: { address: '0x3333333333333333333333333333333333333333' },
      polygon: { address: 'not-an-address' },
    }))
    expect(Object.keys(d).sort()).toEqual(['base', 'ethereum'])
    expect(d.base).toMatchObject({ evmChainId: 8453, startBlock: 5n, testnet: false, explorerUrl: 'https://basescan.org' })
    expect(d.ethereum).toMatchObject({ evmChainId: 11155111, testnet: true, explorerUrl: 'https://sepolia.etherscan.io' })
    expect(parseDeployments('{nope')).toEqual({})
    expect(parseDeployments(undefined)).toEqual({})
  })
})

describe('UI quote helpers against the contract', () => {
  it('launches a wizard draft with the exact initial-buy quote as the slippage floor', async () => {
    const { emptyDraft } = await import('@/features/launch/draft')
    const { toLaunchParams, minInitialTokens, onchainDraftProblem } = await import('@/features/launch/onchain')
    const { quoteLaunch } = await import('./launchpad')
    const draft = { ...emptyDraft('base'), name: 'Wizard Token', symbol: 'WIZ', description: 'From the launch wizard', website: 'https://wiz.example', creatorAllocationPct: 2.5, curveAllocationPct: 75, initialBuyQuote: 0.3 }
    expect(onchainDraftProblem(draft)).toBeNull()
    const base = toLaunchParams(draft)
    expect(base).toMatchObject({ curveBps: 7500, creatorBps: 250, initialBuy: parseEther('0.3'), totalSupply: parseEther('1000000000') })

    const c = createLaunchpadClient(chain.provider, deployment, bob)
    const expected = await quoteLaunch(c.publicClient, deployment.address, { creator: bob, ...base })
    // A floor equal to the exact quote must still succeed (no rounding drift).
    const res = await launchToken(c, { ...base, minTokensOut: expected.tokensOut, deadline: (await chain.now()) + 600n })
    expect(res.tokensBought).toBe(expected.tokensOut)
    expect(minInitialTokens(expected.tokensOut, 500)).toBe((expected.tokensOut * 9500n) / 10_000n)
    const bal = await readBalances(c.publicClient, res.token, bob)
    expect(bal.token).toBe(parseEther('25000000') + expected.tokensOut)

    expect(onchainDraftProblem({ ...draft, name: '🚀'.repeat(9) })).toMatch(/32 bytes/)
  })

  it('trading-panel quotes equal the contract view and flag bad inputs', async () => {
    const { onchainQuote, applySlippage } = await import('./tradeQuote')
    const c = createLaunchpadClient(chain.provider, deployment, alice)
    const { token } = await launchToken(c, await launchParams({ symbol: 'QTE', initialBuy: parseEther('0.4') }))
    const curve = (await readCurve(c.publicClient, deployment.address, token))!
    const buyIn = parseEther('0.25')
    const view = await quoteBuy(c.publicClient, deployment.address, token, buyIn)
    const q = onchainQuote(curve, 'buy', buyIn, 100)
    expect('quote' in q && q.quote.amountOut).toBe(view.tokensOut)
    expect('quote' in q && q.quote.minOut).toBe(applySlippage(view.tokensOut, 100))
    expect('quote' in q && q.quote.priceImpactPct).toBeGreaterThan(0)

    const held = (await readBalances(c.publicClient, token, alice)).token
    const sq = onchainQuote(curve, 'sell', held / 2n, 100, held)
    const sview = await quoteSell(c.publicClient, deployment.address, token, held / 2n)
    expect('quote' in sq && sq.quote.amountOut).toBe(sview.quoteOut)

    expect(onchainQuote(curve, 'buy', 0n, 100)).toEqual({ problem: 'zero' })
    expect(onchainQuote(curve, 'sell', held + 1n, 100, held)).toEqual({ problem: 'balance' })
    expect(onchainQuote(curve, 'sell', curve.curveSupply, 100)).toEqual({ problem: 'exceeds-curve' })
    expect(onchainQuote({ ...curve, complete: true }, 'buy', 1n, 100)).toEqual({ problem: 'complete' })
    expect(applySlippage(10_000n, 999_999)).toBe(5_000n) // clamped to 50%
  })
})
