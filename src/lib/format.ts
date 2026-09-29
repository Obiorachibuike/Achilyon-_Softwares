/**
 * Number, currency, time and address formatting.
 * All formatters accept `null`/`undefined`/`NaN` and return an em dash.
 */

type Numeric = number | string | null | undefined

export const DASH = '—'

export function toNumber(value: Numeric, fallback = 0): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : NaN
  return Number.isFinite(n) ? n : fallback
}

function num(value: Numeric): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : NaN
  return Number.isFinite(n) ? n : null
}

const SUBSCRIPT = '₀₁₂₃₄₅₆₇₈₉'

/**
 * Price formatter that keeps meaningful precision for micro-cap tokens
 * without absurd decimals: $1,284.20 · $1.42 · $0.004213 · $0.0₅4123 (= 0.000004123)
 */
export function formatPrice(value: Numeric): string {
  const n = num(value)
  if (n === null) return DASH
  if (n === 0) return '$0.00'
  if (n < 0) return '-' + formatPrice(-n)
  if (n >= 1) return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: n >= 1000 ? 2 : 4 })
  if (n >= 0.0001) return '$' + n.toLocaleString('en-US', { maximumSignificantDigits: 4 })
  const zeros = Math.floor(-Math.log10(n))
  const digits = Math.round(n * 10 ** (zeros + 4)).toString().slice(0, 4)
  const sub = String(zeros).split('').map((d) => SUBSCRIPT[Number(d)]).join('')
  return `$0.0${sub}${digits}`
}

/** 1284 → 1.28K, 2_840_000 → 2.84M */
export function formatCompact(value: Numeric, maxFractionDigits = 2): string {
  const n = num(value)
  if (n === null) return DASH
  const abs = Math.abs(n)
  if (abs < 1000) return n.toLocaleString('en-US', { maximumFractionDigits: abs < 10 ? 2 : abs < 100 ? 1 : 0 })
  return Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: maxFractionDigits }).format(n)
}

/** $1.42M · $845K · $12.40 */
export function formatUsdCompact(value: Numeric): string {
  const n = num(value)
  if (n === null) return DASH
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs < 1000) return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: abs >= 1 || abs === 0 ? 2 : 0, maximumFractionDigits: abs >= 1 || abs === 0 ? 2 : 4 })}`
  return `${sign}$${formatCompact(abs)}`
}

export function formatUsd(value: Numeric, digits = 2): string {
  const n = num(value)
  if (n === null) return DASH
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/** +12.7% · -3.40% · 0.00% */
export function formatPercent(value: Numeric, digits?: number): string {
  const n = num(value)
  if (n === null) return DASH
  const d = digits ?? (Math.abs(n) >= 100 ? 0 : Math.abs(n) >= 10 ? 1 : 2)
  return `${n > 0 ? '+' : ''}${n.toFixed(d)}%`
}

/** Token amounts: 12,450.21 · 1.24M · 0.0042 */
export function formatTokenAmount(value: Numeric): string {
  const n = num(value)
  if (n === null) return DASH
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return formatCompact(n)
  if (abs >= 1) return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (abs === 0) return '0'
  return n.toLocaleString('en-US', { maximumSignificantDigits: 4 })
}

export function formatInteger(value: Numeric): string {
  const n = num(value)
  return n === null ? DASH : Math.round(n).toLocaleString('en-US')
}

export function formatAge(timestamp: number | null | undefined, now = Date.now()): string {
  if (!timestamp) return DASH
  const seconds = Math.max(0, (now - timestamp) / 1000)
  if (seconds < 60) return `${Math.floor(seconds)}s`
  const minutes = seconds / 60
  if (minutes < 60) return `${Math.floor(minutes)}m`
  const hours = minutes / 60
  if (hours < 24) return `${Math.floor(hours)}h`
  const days = hours / 24
  if (days < 30) return `${Math.floor(days)}d`
  if (days < 365) return `${Math.floor(days / 30)}mo`
  return `${(days / 365).toFixed(1)}y`
}

export function timeAgo(timestamp: number | null | undefined, now = Date.now()): string {
  if (!timestamp) return 'never'
  const s = Math.max(0, Math.round((now - timestamp) / 1000))
  if (s < 5) return 'just now'
  return `${formatAge(timestamp, now)} ago`
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** 0x82a4C1f0…91Fc → 0x82a4...91Fc */
export function shortAddress(address: string | null | undefined, size = 4): string {
  if (!address) return ''
  const head = address.startsWith('0x') ? size + 2 : size
  return address.length <= head + size + 3 ? address : `${address.slice(0, head)}...${address.slice(-size)}`
}

export function pluralize(count: number, word: string, plural = `${word}s`): string {
  return `${formatInteger(count)} ${count === 1 ? word : plural}`
}
