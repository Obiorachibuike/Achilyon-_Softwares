import { describe, expect, it } from 'vitest'
import { addressSchema, commentCreateSchema, launchRequestSchema, listQuerySchema, reportCreateSchema, searchQuerySchema, tokenInfoSchema, tradeRequestSchema } from './schemas'
import { emptyDraft, liquidityPct, toRequest, validateStep } from '@/features/launch/draft'

const EVM = '0x1111111111111111111111111111111111111111'
const SOL = 'So11111111111111111111111111111111111111112'

describe('API validation schemas', () => {
  it('validates EVM and Solana addresses', () => {
    expect(addressSchema.safeParse(EVM).success).toBe(true)
    expect(addressSchema.safeParse(SOL).success).toBe(true)
    expect(addressSchema.safeParse('0x123').success).toBe(false)
    expect(addressSchema.safeParse('0x' + 'z'.repeat(40)).success).toBe(false)
  })

  it('coerces and bounds list queries', () => {
    expect(listQuerySchema.parse({ page: '2', pageSize: '25' })).toMatchObject({ chain: 'all', page: 2, pageSize: 25 })
    expect(listQuerySchema.safeParse({ pageSize: '1000' }).success).toBe(false)
    expect(listQuerySchema.safeParse({ chain: 'moon' }).success).toBe(false)
    expect(searchQuerySchema.safeParse({ q: '   ' }).success).toBe(false)
  })

  it('validates trades', () => {
    const base = { chain: 'base', address: EVM, side: 'buy', amount: 100, slippageBps: 100 }
    expect(tradeRequestSchema.safeParse(base).success).toBe(true)
    expect(tradeRequestSchema.safeParse({ ...base, amount: -1 }).success).toBe(false)
    expect(tradeRequestSchema.safeParse({ ...base, slippageBps: 9000 }).success).toBe(false)
    expect(tradeRequestSchema.safeParse({ ...base, side: 'short' }).success).toBe(false)
  })

  it('validates comments and reports', () => {
    expect(commentCreateSchema.safeParse({ chain: 'base', address: EVM, content: 'gm' }).success).toBe(true)
    expect(commentCreateSchema.safeParse({ chain: 'base', address: EVM, content: '' }).success).toBe(false)
    expect(commentCreateSchema.safeParse({ chain: 'base', address: EVM, content: 'x'.repeat(501) }).success).toBe(false)
    expect(commentCreateSchema.safeParse({ chain: 'base', address: EVM, content: 'hi', parentId: '../../etc' }).success).toBe(false)
    expect(reportCreateSchema.parse({ targetType: 'token', targetId: `base:${EVM}`, reason: 'scam' }).details).toBe('')
    expect(reportCreateSchema.safeParse({ targetType: 'token', targetId: 'abc', reason: 'dislike' }).success).toBe(false)
  })

  it('validates token metadata', () => {
    const info = { name: 'Achilyon', symbol: 'ACH', description: 'A test token for the launchpad.' }
    expect(tokenInfoSchema.safeParse(info).success).toBe(true)
    expect(tokenInfoSchema.safeParse({ ...info, symbol: 'ach' }).success).toBe(false)
    expect(tokenInfoSchema.safeParse({ ...info, name: '<script>' }).success).toBe(false)
    expect(tokenInfoSchema.safeParse({ ...info, website: 'javascript:alert(1)' }).success).toBe(false)
    expect(tokenInfoSchema.safeParse({ ...info, website: 'http://insecure.com' }).success).toBe(false)
    expect(tokenInfoSchema.safeParse({ ...info, logoDataUrl: 'data:image/svg+xml;base64,AAAA' }).success).toBe(false)
  })
})

describe('launch draft', () => {
  const valid = { ...emptyDraft('base'), name: 'Achilyon', symbol: 'ACH', description: 'A test token for the launchpad.' }

  it('produces a request that passes the server schema', () => {
    expect(launchRequestSchema.safeParse(toRequest(valid)).success).toBe(true)
    expect(toRequest(valid).economics.decimals).toBe(18)
    expect(toRequest({ ...valid, chain: 'solana' }).economics.decimals).toBe(6)
  })

  it('derives the liquidity allocation', () => {
    expect(liquidityPct({ ...valid, curveAllocationPct: 75, creatorAllocationPct: 5 })).toBe(20)
  })

  it('reports per-step field errors', () => {
    expect(validateStep(0, emptyDraft('base'))).toHaveProperty('name')
    expect(validateStep(0, valid)).toEqual({})
    expect(validateStep(1, { ...valid, website: 'ftp://x' })).toHaveProperty('website')
    expect(validateStep(2, { ...valid, creatorAllocationPct: 15 })).toHaveProperty('creatorAllocationPct')
    expect(validateStep(2, { ...valid, curveAllocationPct: 90, creatorAllocationPct: 5 })).toHaveProperty('liquidityAllocationPct')
    expect(validateStep(3, { ...valid, slippageBps: 1 })).toHaveProperty('slippageBps')
    expect(validateStep(4, emptyDraft('base'))).toEqual({})
  })
})
