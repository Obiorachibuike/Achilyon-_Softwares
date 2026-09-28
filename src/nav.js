import { LayoutDashboard, LineChart, Star, Bell, ShieldCheck, CandlestickChart, Rocket } from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/markets', label: 'Markets', icon: LineChart },
  { to: '/watchlist', label: 'Watchlist', icon: Star, badge: 'watchlist' },
  { to: '/alerts', label: 'Alerts', icon: Bell, badge: 'alerts' },
  { to: '/analyzer', label: 'Contract Analyzer', icon: ShieldCheck },
  { to: '/trade', label: 'Trade', icon: CandlestickChart },
  { to: '/launchpad', label: 'Launchpad', icon: Rocket },
]
