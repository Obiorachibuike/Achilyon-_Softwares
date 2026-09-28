import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Menu, Moon, Search, Sun } from 'lucide-react'
import Sidebar from './components/Sidebar'
import { NAV_ITEMS } from './nav'
import CommandPalette from './components/CommandPalette'
import Toaster from './components/Toaster'
import Logo from './components/Logo'
import { Spinner } from './components/ui'
import useThemeStore from './store/useThemeStore'
import useMarketStore from './store/useMarketStore'
import useAlertMonitor from './hooks/useAlertMonitor'
import useVisibleInterval from './hooks/useVisibleInterval'
import { config } from './config'
import { timeAgo } from './lib/utils'
import Dashboard from './pages/Dashboard'
import './App.css'

const Markets = lazy(() => import('./pages/Markets'))
const TokenDetail = lazy(() => import('./pages/TokenDetail'))
const Watchlist = lazy(() => import('./pages/Watchlist'))
const Alerts = lazy(() => import('./pages/Alerts'))
const Analyzer = lazy(() => import('./pages/Analyzer'))
const Trade = lazy(() => import('./pages/Trade'))
const Launchpad = lazy(() => import('./pages/Launchpad'))
const NotFound = lazy(() => import('./pages/NotFound'))

function LiveIndicator() {
  const { status, lastUpdated, error } = useMarketStore()
  const [, force] = useState(0)
  useVisibleInterval(() => force((n) => n + 1), 10000)
  const tone = error ? 'bg-amber-400' : status === 'loading' ? 'bg-sky-400' : 'bg-emerald-400'
  return (
    <div className="hidden items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground sm:flex" title={error || undefined}>
      <span className={`h-2 w-2 rounded-full ${tone} ${status !== 'error' ? 'animate-pulse' : ''}`} />
      {status === 'loading' && !lastUpdated ? 'Connecting…' : error ? 'Stale data' : `Live · ${timeAgo(lastUpdated)}`}
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const fetchMarket = useMarketStore((s) => s.fetchMarket)
  const [menuOpen, setMenuOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    document.documentElement.style.colorScheme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#F5F7FB' : '#0A0E15')
  }, [theme])

  useEffect(() => { fetchMarket() }, [fetchMarket])
  const refresh = useCallback(() => fetchMarket({ silent: true }), [fetchMarket])
  useVisibleInterval(refresh, config.refreshIntervalMs)
  useAlertMonitor()

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
    document.getElementById('main-scroll')?.scrollTo({ top: 0 })
    const current = NAV_ITEMS.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)))
    if (!location.pathname.startsWith('/token/')) document.title = current ? `${current.label} · Achilyon` : 'Achilyon | On-Chain Discovery Terminal'
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
  }, [menuOpen])

  return (
    <div className="app-shell flex h-[100dvh] overflow-hidden bg-background font-sans text-foreground">
      <a href="#main-scroll" className="skip-link">Skip to content</a>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} onOpenPalette={() => { setMenuOpen(false); setPaletteOpen(true) }} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border px-4 md:px-6">
          <button type="button" onClick={() => setMenuOpen(true)} className="-ml-1 rounded-lg p-2 text-muted-foreground hover:text-foreground md:hidden" aria-label="Open navigation menu" aria-expanded={menuOpen}>
            <Menu size={22} />
          </button>
          <Logo compact className="md:hidden" />
          <button type="button" onClick={() => setPaletteOpen(true)} className="ml-auto flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm text-muted-foreground hover:text-foreground md:ml-0 md:w-80" aria-label="Open command palette">
            <Search size={16} />
            <span className="hidden md:inline">Search tokens or jump to…</span>
            <kbd className="ml-auto hidden rounded border border-border px-1.5 text-[10px] md:inline">⌘K</kbd>
          </button>
          <div className="flex items-center gap-2 md:ml-auto">
            <LiveIndicator />
            <button type="button" aria-label="Toggle color theme" onClick={toggleTheme} className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:text-foreground">
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>
          </div>
        </header>
        <main id="main-scroll" className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6">
            <Suspense fallback={<Spinner />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/markets" element={<Markets />} />
                <Route path="/token/:chainId/:pairAddress" element={<TokenDetail />} />
                <Route path="/watchlist" element={<Watchlist />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/analyzer" element={<Analyzer />} />
                <Route path="/trade" element={<Trade />} />
                <Route path="/trade/:chainId/:pairAddress" element={<Trade />} />
                <Route path="/launchpad" element={<Launchpad />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <Toaster />
    </div>
  )
}
