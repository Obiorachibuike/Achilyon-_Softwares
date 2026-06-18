import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value)
}

export function formatCompactNumber(number) {
  if (number === undefined || number === null) return '0'
  const num = parseFloat(number)
  if (num < 1000) return num.toFixed(2)
  return Intl.NumberFormat('en-US', {
    notation: "compact",
    maximumFractionDigits: 2
  }).format(num)
}

export function getMappedChainId(chainId) {
  if (!chainId) return ''
  const mapping = {
    'bnb': 'bsc',
  }
  return mapping[chainId.toLowerCase()] || chainId.toLowerCase()
}

export function getDisplayChainName(chainId) {
  if (!chainId) return ''
  const mapping = {
    'bsc': 'BNB',
  }
  return mapping[chainId.toLowerCase()] || chainId.toUpperCase()
}
