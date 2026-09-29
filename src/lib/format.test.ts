import { describe, expect, it } from 'vitest'
import { formatAge, formatCompact, formatPercent, formatPrice, formatTokenAmount, formatUsdCompact, pluralize, shortAddress, timeAgo, toNumber } from './format'

describe('formatPrice', () => {
  it('keeps precision appropriate to magnitude', () => {
    expect(formatPrice(1284.2)).toBe('$1,284.20')
    expect(formatPrice(1.4215)).toBe('$1.4215')
    expect(formatPrice(0.004213)).toBe('$0.004213')
  })
  it('uses subscript zero notation for micro prices', () => {
    expect(formatPrice(0.000004123)).toBe('$0.0₅4123')
    expect(formatPrice(0.00000000089)).toBe('$0.0₉8900')
  })
  it('handles zero, negatives and garbage', () => {
    expect(formatPrice(0)).toBe('$0.00')
    expect(formatPrice(-2)).toBe('-$2.00')
    expect(formatPrice(Number.NaN)).toBe('—')
    expect(formatPrice(null)).toBe('—')
    expect(formatPrice('abc')).toBe('—')
  })
})

describe('compact formatting', () => {
  it('abbreviates large values', () => {
    expect(formatCompact(1284)).toBe('1.28K')
    expect(formatCompact(2_840_000)).toBe('2.84M')
    expect(formatUsdCompact(1_420_000)).toBe('$1.42M')
    expect(formatUsdCompact(845_000)).toBe('$845K')
    expect(formatUsdCompact(12.4)).toBe('$12.40')
    expect(formatUsdCompact(-5_000)).toBe('-$5K')
  })
  it('formats token amounts', () => {
    expect(formatTokenAmount(12450.214)).toBe('12,450.21')
    expect(formatTokenAmount(3_500_000)).toBe('3.5M')
    expect(formatTokenAmount(0.0042)).toBe('0.0042')
    expect(formatTokenAmount(0)).toBe('0')
  })
})

describe('formatPercent', () => {
  it('signs positive values and scales digits', () => {
    expect(formatPercent(12.74)).toBe('+12.7%')
    expect(formatPercent(-3.4)).toBe('-3.40%')
    expect(formatPercent(0)).toBe('0.00%')
    expect(formatPercent(1234.5)).toBe('+1235%')
  })
})

describe('time and address helpers', () => {
  const now = 1_700_000_000_000
  it('formats ages', () => {
    expect(formatAge(now - 30_000, now)).toBe('30s')
    expect(formatAge(now - 5 * 60_000, now)).toBe('5m')
    expect(formatAge(now - 3 * 3_600_000, now)).toBe('3h')
    expect(formatAge(now - 2 * 86_400_000, now)).toBe('2d')
    expect(formatAge(now - 60 * 86_400_000, now)).toBe('2mo')
    expect(formatAge(null, now)).toBe('—')
    expect(timeAgo(now - 1000, now)).toBe('just now')
    expect(timeAgo(now - 120_000, now)).toBe('2m ago')
  })
  it('shortens addresses', () => {
    expect(shortAddress('0x82a4C1f0000000000000000000000000000091Fc')).toBe('0x82a4...91Fc')
    expect(shortAddress('So11111111111111111111111111111111111111112')).toBe('So11...1112')
    expect(shortAddress('0x1234')).toBe('0x1234')
    expect(shortAddress(null)).toBe('')
  })
  it('pluralizes and parses numbers', () => {
    expect(pluralize(1, 'holder')).toBe('1 holder')
    expect(pluralize(1200, 'holder')).toBe('1,200 holders')
    expect(toNumber('3.5')).toBe(3.5)
    expect(toNumber('x', 7)).toBe(7)
  })
})
