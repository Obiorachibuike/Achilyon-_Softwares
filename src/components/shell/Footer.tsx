import Link from 'next/link'
import { LogoMark } from './Logo'

const COLUMNS = [
  { title: 'Product', links: [{ href: '/discover', label: 'Discover' }, { href: '/trending', label: 'Trending' }, { href: '/launch', label: 'Launch a token' }, { href: '/portfolio', label: 'Portfolio' }] },
  { title: 'Resources', links: [{ href: '/docs', label: 'Documentation' }, { href: '/docs#bonding-curve', label: 'Bonding curves' }, { href: '/docs#api', label: 'API' }, { href: '/analyzer', label: 'Contract analyzer' }] },
  { title: 'Community', links: [{ href: '/community', label: 'Live activity' }, { href: '/docs#guidelines', label: 'Guidelines' }, { href: '/docs#moderation', label: 'Moderation' }] },
  { title: 'Legal', links: [{ href: '/docs#risk', label: 'Risk disclosure' }, { href: '/docs#privacy', label: 'Privacy' }, { href: '/docs#terms', label: 'Terms of use' }] },
]

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto grid max-w-[1600px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.3fr_repeat(4,1fr)]">
        <div className="max-w-xs">
          <div className="flex items-center gap-2.5"><LogoMark size={28} /><span className="font-display font-bold tracking-wide">ACHILYON</span></div>
          <p className="mt-3 text-sm text-muted">The home of emerging crypto markets. Discover, launch and analyze tokens across chains.</p>
          <p className="mt-4 text-xs leading-relaxed text-subtle">
            Crypto assets are highly volatile and can lose all their value. Nothing on Achilyon is financial advice, and a token being listed here does not mean it is safe.
          </p>
        </div>
        {COLUMNS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-subtle">{c.title}</p>
            <ul className="mt-3 space-y-2">
              {c.links.map((l) => <li key={l.href}><Link href={l.href} className="text-sm text-muted hover:text-fg">{l.label}</Link></li>)}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-5 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} Achilyon Softwares</span>
          <span>Market data: DexScreener & GeckoTerminal (live mode) · Security data: GoPlus</span>
        </div>
      </div>
    </footer>
  )
}
