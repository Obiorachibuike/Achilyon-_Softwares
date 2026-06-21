import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value) {
  if (value === null || value === undefined) return '$0.00'
  const val = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(val)) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(val)
}

export function formatCompactNumber(number) {
  if (number === null || number === undefined) return '0.00'
  const val = typeof number === 'string' ? parseFloat(number) : number
  if (isNaN(val)) return '0.00'
  if (val < 1000) return val.toFixed(2)
  return Intl.NumberFormat('en-US', {
    notation: "compact",
    maximumFractionDigits: 2
  }).format(val)
}

export function getMappedChainId(chainName) {
  const mapping = {
    'ethereum': 'ethereum',
    'base': 'base',
    'bnb': 'bsc',
    'solana': 'solana',
    'arbitrum': 'arbitrum',
    'polygon': 'polygon',
    'avalanche': 'avalanche'
  }
  return mapping[chainName.toLowerCase()] || chainName.toLowerCase()
}

export function getDisplayChainName(chainId) {
  if (!chainId) return 'UNK'
  const mapping = {
    'ethereum': 'ETH',
    'base': 'BASE',
    'bsc': 'BNB',
    'solana': 'SOL',
    'arbitrum': 'ARB',
    'polygon': 'POLY',
    'avalanche': 'AVAX'
  }
  return mapping[chainId.toLowerCase()] || chainId.toUpperCase()
}
