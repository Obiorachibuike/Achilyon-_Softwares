'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChainId } from '@/types'

export interface RecentToken {
  chain: ChainId
  address: string
  symbol: string
  name: string
  logoUrl: string | null
  viewedAt: number
}

interface RecentStore {
  items: RecentToken[]
  record: (t: Omit<RecentToken, 'viewedAt'>) => void
  clear: () => void
}

/** Recently viewed tokens (localStorage, max 12). */
export const useRecentStore = create<RecentStore>()(
  persist(
    (set) => ({
      items: [],
      record: (t) =>
        set((s) => ({
          items: [{ ...t, logoUrl: t.logoUrl?.startsWith('data:') ? null : t.logoUrl, viewedAt: Date.now() }, ...s.items.filter((i) => !(i.chain === t.chain && i.address.toLowerCase() === t.address.toLowerCase()))].slice(0, 12),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: 'achilyon-recent', version: 1 },
  ),
)
