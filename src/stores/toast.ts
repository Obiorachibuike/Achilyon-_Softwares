'use client'
import { create } from 'zustand'

export type ToastTone = 'info' | 'success' | 'error' | 'warning'

export interface Toast {
  id: string
  title: string
  description?: string
  tone: ToastTone
}

interface ToastStore {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'> & { duration?: number }) => string
  dismiss: (id: string) => void
}

let seq = 0

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  push: ({ duration = 4500, ...t }) => {
    const id = `t${++seq}`
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, ...t }] }))
    if (duration > 0) setTimeout(() => get().dismiss(id), duration)
    return id
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  info: (title: string, description?: string) => useToastStore.getState().push({ title, description, tone: 'info' }),
  success: (title: string, description?: string) => useToastStore.getState().push({ title, description, tone: 'success' }),
  error: (title: string, description?: string) => useToastStore.getState().push({ title, description, tone: 'error', duration: 7000 }),
  warning: (title: string, description?: string) => useToastStore.getState().push({ title, description, tone: 'warning', duration: 6000 }),
}
