import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return '$0.00'

  // For small prices, use more decimals
  const decimals = value < 1 ? 6 : 2

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
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
