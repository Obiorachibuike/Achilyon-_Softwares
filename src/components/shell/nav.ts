import { Activity, BellRing, BookOpen, Compass, Flame, Home, LineChart, Rocket, Settings, ShieldCheck, Sparkles, Star, TrendingDown, TrendingUp, Users, Wallet, Layers, Receipt, type LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
  badge?: 'watchlist'
}

export const PRIMARY_NAV: NavItem[] = [
  { href: '/', label: 'Home', icon: Home, exact: true },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/trending', label: 'Trending', icon: Flame },
  { href: '/new', label: 'New Tokens', icon: Sparkles },
  { href: '/pairs', label: 'New Pairs', icon: Layers },
  { href: '/gainers', label: 'Gainers', icon: TrendingUp },
  { href: '/losers', label: 'Losers', icon: TrendingDown },
]

export const ACCOUNT_NAV: NavItem[] = [
  { href: '/watchlist', label: 'Watchlist', icon: Star, badge: 'watchlist' },
  { href: '/portfolio', label: 'Portfolio', icon: Wallet },
  { href: '/transactions', label: 'Transactions', icon: Receipt },
  { href: '/launch', label: 'Launch Token', icon: Rocket },
  { href: '/my-tokens', label: 'My Tokens', icon: LineChart },
]

export const TOOLS_NAV: NavItem[] = [
  { href: '/analyzer', label: 'Contract Analyzer', icon: ShieldCheck },
  { href: '/alerts', label: 'Price Alerts', icon: BellRing },
]

export const FOOTER_NAV: NavItem[] = [
  { href: '/docs', label: 'Documentation', icon: BookOpen },
  { href: '/community', label: 'Community', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export const MOBILE_TABS: NavItem[] = [
  { href: '/', label: 'Home', icon: Home, exact: true },
  { href: '/discover', label: 'Markets', icon: Activity },
  { href: '/launch', label: 'Launch', icon: Rocket },
  { href: '/portfolio', label: 'Portfolio', icon: Wallet },
]

export const ALL_NAV = [...PRIMARY_NAV, ...ACCOUNT_NAV, ...TOOLS_NAV, ...FOOTER_NAV]

export function isActive(pathname: string, item: NavItem): boolean {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
}
