import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value) {
  if (value === null || value === undefined) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value)
}

export function formatCompactNumber(number) {
  if (number === null || number === undefined) return '0.00'
  if (number < 1000) return typeof number === 'number' ? number.toFixed(2) : parseFloat(number).toFixed(2)
  return Intl.NumberFormat('en-US', {
    notation: "compact",
    maximumFractionDigits: 2
  }).format(number)
}

export function formatPercentage(value) {
  if (value === null || value === undefined) return '0.00%'
  return `${value.toFixed(2)}%`
}

export function getMappedChainId(internalId) {
  const mapping = {
    'ethereum': 'ethereum',
    'base': 'base',
    'bnb': 'bsc',
    'solana': 'solana',
    'arbitrum': 'arbitrum',
    'polygon': 'polygon',
    'avalanche': 'avalanche'
  }
  return mapping[internalId] || internalId
}

export function getDisplayChainName(chainId) {
  const names = {
    'ethereum': 'Ethereum',
    'base': 'Base',
    'bsc': 'BNB',
    'solana': 'Solana',
    'arbitrum': 'Arbitrum',
    'polygon': 'Polygon',
    'avalanche': 'Avalanche'
  }
  return names[chainId] || (chainId ? chainId.charAt(0).toUpperCase() + chainId.slice(1) : '')
}
