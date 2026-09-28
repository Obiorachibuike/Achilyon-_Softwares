import { create } from 'zustand'
import { uid } from '../lib/utils'

const useToastStore = create((set, get) => ({
  toasts: [],
  push: ({ title, description = '', tone = 'info', duration = 4500 }) => {
    const id = uid()
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, title, description, tone }] }))
    if (duration) setTimeout(() => get().dismiss(id), duration)
    return id
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = (opts) => useToastStore.getState().push(typeof opts === 'string' ? { title: opts } : opts)

export default useToastStore
