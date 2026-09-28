import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : null
}

/** Price formatter that keeps precision for micro-cap tokens (e.g. $0.0₅4123). */
export function formatPrice(value) {
  const n = num(value)
  if (n === null) return '—'
  if (n === 0) return '$0.00'
  if (n >= 1) return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: n >= 1000 ? 2 : 4 })
  if (n >= 0.0001) return '$' + n.toLocaleString('en-US', { maximumSignificantDigits: 4 })
  const zeros = Math.floor(-Math.log10(n)) // zeros right after the decimal point
  const digits = Math.round(n * 10 ** (zeros + 4)).toString().slice(0, 4)
  const sub = String(zeros).split('').map(d => '₀₁₂₃₄₅₆₇₈₉'[d]).join('')
  return `$0.0${sub}${digits}`
}

export const formatCurrency = formatPrice

export function formatCompactNumber(value) {
  const n = num(value)
  if (n === null) return '—'
  if (Math.abs(n) < 1000) return n.toFixed(n % 1 === 0 ? 0 : 2)
  return Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(n)
}

export function formatUsdCompact(value) {
  const n = num(value)
  if (n === null) return '—'
  return (n < 0 ? '-$' : '$') + formatCompactNumber(Math.abs(n))
}

export function formatUsd(value, digits = 2) {
  const n = num(value)
  if (n === null) return '—'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export function formatPercent(value, digits = 2) {
  const n = num(value)
  if (n === null) return '—'
  return `${n > 0 ? '+' : ''}${n.toFixed(digits)}%`
}

export function formatAge(timestamp, now = Date.now()) {
  if (!timestamp) return '—'
  const minutes = Math.max(0, (now - timestamp) / 60000)
  if (minutes < 60) return `${Math.floor(minutes)}m`
  const hours = minutes / 60
  if (hours < 24) return `${Math.floor(hours)}h`
  const days = hours / 24
  if (days < 30) return `${Math.floor(days)}d`
  if (days < 365) return `${Math.floor(days / 30)}mo`
  return `${(days / 365).toFixed(1)}y`
}

export function timeAgo(timestamp, now = Date.now()) {
  if (!timestamp) return 'never'
  const s = Math.max(0, Math.round((now - timestamp) / 1000))
  if (s < 10) return 'just now'
  if (s < 60) return `${s}s ago`
  return `${formatAge(timestamp, now)} ago`
}

export function shortAddress(address, size = 4) {
  if (!address) return ''
  return address.length <= size * 2 + 3 ? address : `${address.slice(0, size + 2)}…${address.slice(-size)}`
}

export const toNumber = (v, fallback = 0) => num(v) ?? fallback

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
