'use client'
import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/cn'
import { toast } from '@/stores/toast'

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function CopyButton({ value, label = 'Copy', className, size = 13 }: { value: string; label?: string; className?: string; size?: number }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (await copyText(value)) {
          setDone(true)
          toast.success('Copied to clipboard')
          setTimeout(() => setDone(false), 1400)
        } else toast.error('Copy failed', 'Your browser blocked clipboard access.')
      }}
      className={cn('inline-flex items-center rounded-md p-1 text-subtle transition-colors hover:bg-white/5 hover:text-fg', className)}
      aria-label={done ? 'Copied' : label}
      title={label}
    >
      {done ? <Check className="text-up" style={{ width: size, height: size }} /> : <Copy style={{ width: size, height: size }} />}
    </button>
  )
}
