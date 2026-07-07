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
    maximumFractionDigits: 6,
  }).format(value)
}

export function formatCompactNumber(number) {
  const val = parseFloat(number)
  if (isNaN(val)) return '0.00'
  if (val < 1000) return val.toFixed(2)
  return Intl.NumberFormat('en-US', {
    notation: "compact",
    maximumFractionDigits: 2
  }).format(val)
}
