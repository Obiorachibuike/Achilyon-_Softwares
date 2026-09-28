import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const legacy = typeof localStorage !== 'undefined' ? localStorage.getItem('nexus-theme') : null

const useThemeStore = create(
  persist(
    (set) => ({
      theme: legacy === 'light' ? 'light' : 'dark',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
    }),
    { name: 'achilyon-theme' },
  ),
)

export default useThemeStore
