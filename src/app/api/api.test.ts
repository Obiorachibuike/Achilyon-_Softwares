import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { MarketToken, Paginated, Session } from '@/types'

/**
 * Route-handler integration tests: real handlers, real validation, demo
 * engine as the data source. Only the request cookie jar is stubbed.
 */
const jar = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}))

const { GET: listTokens } = await import('./tokens/route')
const { GET: search } = await import('./search/route')
const { POST: postComment } = await import('./comments/route')
const { POST: trade } = await import('./trade/route')
const { POST: launch } = await import('./launch/route')
const { POST: addWatch } = await import('./watchlist/route')
const { seal, SESSION_COOKIE } = await import('@/services/auth/session')
const { DEMO_WALLET_ADDRESS } = await import('@/lib/config')

const ctx = { params: Promise.resolve({}) }
let ipSeq = 0
const req = (path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) =>
  new NextRequest(`http://localhost:3000${path}`, {
    method: init.method ?? 'GET',
    // Unique IP per request so rate limits don't couple tests together.
    headers: { host: 'localhost:3000', 'x-forwarded-for': `10.0.0.${++ipSeq}`, 'content-type': 'application/json', ...init.headers },
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  })

function signIn(address = DEMO_WALLET_ADDRESS, demo = true) {
  const now = Date.now()
  const s: Session = { address, role: 'user', demo, issuedAt: now, expiresAt: now + 3_600_000 }
  jar.set(SESSION_COOKIE, seal(s))
}

async function firstToken(): Promise<MarketToken> {
  const res = await listTokens(req('/api/tokens?pageSize=1&status=listed'), ctx)
  const body = (await res.json()) as { data: Paginated<MarketToken> }
  return body.data.items[0]!
}

beforeEach(() => jar.clear())

describe('GET /api/tokens', () => {
  it('returns a paginated success envelope', async () => {
    const res = await listTokens(req('/api/tokens?pageSize=5&sort=volume&dir=desc'), ctx)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean; data: Paginated<MarketToken>; meta: { demo: boolean } }
    expect(body.ok).toBe(true)
    expect(body.data.items).toHaveLength(5)
    expect(body.meta.demo).toBe(true)
    const vols = body.data.items.map((t) => t.market.volume.h24)
    expect(vols).toEqual([...vols].sort((a, b) => b - a))
  })

  it('rejects invalid query params with a validation error', async () => {
    const res = await listTokens(req('/api/tokens?pageSize=100000'), ctx)
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } })
  })

  it('applies filters server-side', async () => {
    const res = await listTokens(req('/api/tokens?chain=solana&pageSize=50'), ctx)
    const body = (await res.json()) as { data: Paginated<MarketToken> }
    expect(body.data.items.every((t) => t.token.chain === 'solana')).toBe(true)
  })
})

describe('GET /api/search', () => {
  it('requires a query', async () => {
    expect((await search(req('/api/search?q='), ctx)).status).toBe(400)
  })
  it('finds a token by its exact symbol', async () => {
    const t = await firstToken()
    const res = await search(req(`/api/search?q=${encodeURIComponent(t.token.symbol)}`), ctx)
    const body = (await res.json()) as { data: { tokens: MarketToken[] } }
    expect(body.data.tokens.some((x) => x.token.address === t.token.address)).toBe(true)
  })
})

describe('auth, CSRF and write endpoints', () => {
  it('requires a session to comment', async () => {
    const t = await firstToken()
    const res = await postComment(req('/api/comments', { method: 'POST', body: { chain: t.token.chain, address: t.token.address, content: 'gm' } }), ctx)
    expect(res.status).toBe(401)
  })

  it('blocks cross-origin writes', async () => {
    signIn()
    const t = await firstToken()
    const res = await postComment(req('/api/comments', { method: 'POST', body: { chain: t.token.chain, address: t.token.address, content: 'gm' }, headers: { origin: 'https://evil.example' } }), ctx)
    expect(res.status).toBe(403)
  })

  it('stores sanitized comments', async () => {
    signIn()
    const t = await firstToken()
    const res = await postComment(req('/api/comments', { method: 'POST', body: { chain: t.token.chain, address: t.token.address, content: 'nice\u202E  chart <b>ok</b>' } }), ctx)
    expect(res.status).toBe(201)
    const body = (await res.json()) as { data: { content: string } }
    expect(body.data.content).toBe('nice chart <b>ok</b>') // stored as text; React escapes on render
  })

  it('rejects malformed JSON bodies', async () => {
    signIn()
    const bad = new NextRequest('http://localhost:3000/api/watchlist', { method: 'POST', headers: { host: 'localhost:3000', 'x-forwarded-for': '10.9.9.9' }, body: '{not json' })
    const res = await addWatch(bad, ctx)
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: { code: 'INVALID_JSON' } })
  })
})

describe('POST /api/trade', () => {
  it('refuses real wallets (no faked on-chain execution)', async () => {
    signIn('0x1111111111111111111111111111111111111111', false)
    const t = await firstToken()
    const res = await trade(req('/api/trade', { method: 'POST', body: { chain: t.token.chain, address: t.token.address, side: 'buy', amount: 10, slippageBps: 100 } }), ctx)
    expect(res.status).toBe(501)
  })

  it('settles a demo buy and sell, flagged as simulated', async () => {
    signIn()
    const t = await firstToken()
    const buy = await trade(req('/api/trade', { method: 'POST', body: { chain: t.token.chain, address: t.token.address, side: 'buy', amount: 50, slippageBps: 500 } }), ctx)
    expect(buy.status).toBe(200)
    const b = (await buy.json()) as { data: { simulated: boolean; balance: { tokenAmount: number } } }
    expect(b.data.simulated).toBe(true)
    expect(b.data.balance.tokenAmount).toBeGreaterThan(0)

    const tooMuch = await trade(req('/api/trade', { method: 'POST', body: { chain: t.token.chain, address: t.token.address, side: 'sell', amount: b.data.balance.tokenAmount * 10, slippageBps: 500 } }), ctx)
    expect(tooMuch.status).toBe(400)
  })
})

describe('POST /api/launch', () => {
  const body = {
    info: { name: 'Test Launch', symbol: 'TLCH', description: 'Integration test launch token.' },
    economics: { totalSupply: 1_000_000_000, decimals: 18, creatorAllocationPct: 0, curveAllocationPct: 80, liquidityAllocationPct: 20 },
    settings: { chain: 'base', initialBuyQuote: 0, slippageBps: 500, antiSnipeBlocks: 0, maxWalletPct: 100 },
  }

  it('rejects allocations that do not total 100%', async () => {
    signIn()
    const res = await launch(req('/api/launch', { method: 'POST', body: { ...body, economics: { ...body.economics, liquidityAllocationPct: 30 } } }), ctx)
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR', message: 'Allocations must total 100%' } })
  })

  it('rejects an initial buy larger than the demo balance', async () => {
    signIn()
    const res = await launch(req('/api/launch', { method: 'POST', body: { ...body, info: { ...body.info, symbol: 'RICH' }, settings: { ...body.settings, initialBuyQuote: 1_000_000 } } }), ctx)
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: { code: 'INSUFFICIENT_BALANCE' } })
  })

  it('creates a simulated launch on the bonding curve', async () => {
    signIn()
    const res = await launch(req('/api/launch', { method: 'POST', body }), ctx)
    expect(res.status).toBe(201)
    const data = ((await res.json()) as { data: { token: MarketToken; simulated: boolean } }).data
    expect(data.simulated).toBe(true)
    expect(data.token.token.status).toBe('bonding')
    expect(data.token.curve?.progress).toBe(0)
  })
})
