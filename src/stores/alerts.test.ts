import { describe, expect, it } from 'vitest'
import { evaluateAlert } from './alerts'

describe('evaluateAlert', () => {
  it('triggers price thresholds inclusively', () => {
    expect(evaluateAlert({ type: 'price_above', value: 1 }, 1, 0)).toBe(1)
    expect(evaluateAlert({ type: 'price_above', value: 1 }, 0.99, 0)).toBeNull()
    expect(evaluateAlert({ type: 'price_below', value: 1 }, 0.5, 0)).toBe(0.5)
  })
  it('triggers on 24h change', () => {
    expect(evaluateAlert({ type: 'change_above', value: 10 }, 1, 12)).toBe(12)
    expect(evaluateAlert({ type: 'change_below', value: -10 }, 1, -5)).toBeNull()
  })
  it('never triggers on missing data', () => {
    expect(evaluateAlert({ type: 'price_below', value: 1 }, null, null)).toBeNull()
    expect(evaluateAlert({ type: 'change_below', value: 0 }, 1, null)).toBeNull()
  })
})
