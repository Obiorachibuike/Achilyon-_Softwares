import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return '$0.00'

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: value < 1 ? 6 : 2,
  })
  return formatter.format(value)
}

export function formatCompactNumber(number) {
  if (number === null || number === undefined || isNaN(number)) return '0.00'
  const val = parseFloat(number)
  if (val < 1000) return val.toFixed(2)

  return Intl.NumberFormat('en-US', {
    notation: "compact",
    maximumFractionDigits: 2
  }).format(val)
}
