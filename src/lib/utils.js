import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value < 1 ? 6 : 2,
    maximumFractionDigits: value < 1 ? 6 : 2,
  }).format(value)
}

export function formatCompactNumber(number) {
  if (number === null || number === undefined || isNaN(number)) return '0'
  if (number < 1000) return number.toFixed(2)
  return Intl.NumberFormat('en-US', {
    notation: "compact",
    maximumFractionDigits: 2
  }).format(number)
}

export function getMappedChainId(chainId) {
  const mapping = {
    'bnb': 'bsc',
    'ethereum': 'ethereum',
    'base': 'base',
    'solana': 'solana',
    'arbitrum': 'arbitrum',
    'polygon': 'polygon',
    'avalanche': 'avalanche'
  }
  return mapping[chainId] || chainId
}
