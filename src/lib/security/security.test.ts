import { describe, expect, it } from 'vitest'
import { countLinks, safeUrl, sanitizeSingleLine, sanitizeText } from './sanitize'
import { moderate, type ModerationContext } from './moderation'
import { checkRateLimit, MemoryRateLimitStore } from './rateLimit'

describe('sanitize', () => {
  it('strips bidi overrides, zero-width and control characters', () => {
    expect(sanitizeText('he\u202Ello\u200B\u0007 world')).toBe('hello world')
  })
  it('collapses whitespace, blank lines and enforces length', () => {
    expect(sanitizeText('a\r\n\n\n\nb   c')).toBe('a\n\nb c')
    expect(sanitizeText('x'.repeat(900))).toHaveLength(500)
    expect(sanitizeSingleLine('  multi\nline  ')).toBe('multi line')
  })
  it('only allows http(s) URLs', () => {
    expect(safeUrl('https://achilyon.app/x')).toBe('https://achilyon.app/x')
    expect(safeUrl('javascript:alert(1)')).toBeUndefined()
    expect(safeUrl('data:text/html,<script>')).toBeUndefined()
    expect(safeUrl('not a url')).toBeUndefined()
  })
  it('counts links', () => {
    expect(countLinks('visit https://a.io and www.b.com or c.xyz')).toBe(3)
    expect(countLinks('no links here')).toBe(0)
    expect(countLinks('https://a.io https://b.io')).toBe(2)
  })
})

describe('moderation', () => {
  const now = 1_700_000_000_000
  const ctx = (o: Partial<ModerationContext>): ModerationContext => ({ author: '0xabc', content: 'Solid chart, watching this one', recentByAuthor: [], blacklisted: false, now, ...o })

  it('allows normal comments', () => expect(moderate(ctx({})).verdict).toBe('allow'))
  it('rejects blacklisted authors', () => expect(moderate(ctx({ blacklisted: true })).verdict).toBe('reject'))
  it('rejects flooding and duplicates', () => {
    const recent = Array.from({ length: 5 }, (_, i) => ({ content: `msg ${i}`, createdAt: now - 1000 * i }))
    expect(moderate(ctx({ recentByAuthor: recent })).reasons).toContain('You are commenting too quickly')
    expect(moderate(ctx({ recentByAuthor: [{ content: 'solid  CHART, watching this one', createdAt: now - 60_000 }] })).verdict).toBe('reject')
    expect(moderate(ctx({ recentByAuthor: [{ content: 'Solid chart, watching this one', createdAt: now - 11 * 60_000 }] })).verdict).toBe('allow')
  })
  it('flags links and scam language, rejects link spam', () => {
    expect(moderate(ctx({ content: 'site is https://a.io' })).verdict).toBe('flag')
    expect(moderate(ctx({ content: 'https://a.io https://b.io https://c.io' })).verdict).toBe('reject')
    expect(moderate(ctx({ content: 'DM me for the airdrop, just share your seed phrase' })).verdict).toBe('flag')
    expect(moderate(ctx({ content: 'aaaaaaaaaaaaaaa' })).verdict).toBe('reject')
  })
})

describe('rate limiting', () => {
  it('allows up to the limit per window then blocks until reset', () => {
    const store = new MemoryRateLimitStore()
    const rule = { limit: 3, windowMs: 1000 }
    const results = [0, 1, 2, 3].map(() => checkRateLimit(store, 'k', rule, 0))
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false])
    expect(results[2]?.remaining).toBe(0)
    expect(checkRateLimit(store, 'other', rule, 0).allowed).toBe(true)
    expect(checkRateLimit(store, 'k', rule, 1000).allowed).toBe(true)
  })
})
