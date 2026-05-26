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
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatCompactNumber(number) {
  if (number === null || number === undefined) return 'N/A'
  return Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(number)
}

export function formatPercent(value) {
  if (value === null || value === undefined) return '0%'
  const formatted = (value).toFixed(2)
  return `${formatted > 0 ? '+' : ''}${formatted}%`
}
