/** Deterministic PRNG utilities so demo data is stable between restarts. */

export type Rng = () => number

/** mulberry32 — small, fast, good-enough PRNG for simulation. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export const rngFor = (key: string) => mulberry32(hashString(key))

export const between = (rng: Rng, min: number, max: number) => min + rng() * (max - min)

export const logBetween = (rng: Rng, min: number, max: number) => Math.exp(between(rng, Math.log(min), Math.log(max)))

export const intBetween = (rng: Rng, min: number, max: number) => Math.floor(between(rng, min, max + 1))

export function pick<T>(rng: Rng, items: readonly T[]): T {
  const item = items[Math.floor(rng() * items.length)]
  if (item === undefined) throw new Error('pick() on empty list')
  return item
}

/** Standard normal via Box–Muller. */
export function gaussian(rng: Rng): number {
  const u = Math.max(rng(), 1e-12)
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const HEX = '0123456789abcdef'
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

export function evmAddress(rng: Rng): string {
  let s = '0x'
  for (let i = 0; i < 40; i++) s += HEX[Math.floor(rng() * 16)]
  return s
}

export function solanaAddress(rng: Rng): string {
  let s = ''
  for (let i = 0; i < 44; i++) s += B58[Math.floor(rng() * 58)]
  return s
}

export function txHash(rng: Rng, solana = false): string {
  if (solana) {
    let s = ''
    for (let i = 0; i < 88; i++) s += B58[Math.floor(rng() * 58)]
    return s
  }
  let s = '0x'
  for (let i = 0; i < 64; i++) s += HEX[Math.floor(rng() * 16)]
  return s
}
