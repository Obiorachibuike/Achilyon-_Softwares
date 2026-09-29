'use client'
import { create } from 'zustand'
import type { AppNotification } from '@/types'

interface NotificationStore {
  items: AppNotification[]
  push: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void
  markAllRead: () => void
  clear: () => void
}

let seq = 0

/** In-app notification center (session-scoped). Fed by alerts, watchlist activity and launches. */
export const useNotifications = create<NotificationStore>((set) => ({
  items: [],
  push: (n) => set((s) => ({ items: [{ ...n, id: `n${++seq}`, createdAt: Date.now(), read: false }, ...s.items].slice(0, 40) })),
  markAllRead: () => set((s) => ({ items: s.items.map((i) => ({ ...i, read: true })) })),
  clear: () => set({ items: [] }),
}))
