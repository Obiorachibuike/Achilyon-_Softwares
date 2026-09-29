import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { DEFAULT_START_MCAP_USD } from '@/lib/bondingCurve'

export const metadata: Metadata = {
  title: 'Docs',
  description: 'How Achilyon works: bonding curves, risk signals, the public API, community guidelines, moderation, privacy and terms.',
  alternates: { canonical: '/docs' },
}

const TOC = [
  ['getting-started', 'Getting started'],
  ['bonding-curve', 'Bonding curve'],
  ['trading', 'Trading & slippage'],
  ['risk', 'Risk signals'],
  ['api', 'Public API'],
  ['guidelines', 'Community guidelines'],
  ['moderation', 'Moderation'],
  ['community', 'Community'],
  ['privacy', 'Privacy'],
  ['terms', 'Terms of use'],
] as const

const ENDPOINTS: [string, string, string][] = [
  ['GET', '/api/tokens', 'Market list. Query: list=all|trending|new|pairs|gainers|losers, chain, q, minMarketCap, maxMarketCap, minLiquidity, minVolume, maxAgeHours, changeDirection=up|down, minChange, status=bonding|migrated|listed, dex, verified=1, sort, dir, page, pageSize (≤200).'],
  ['GET', '/api/tokens/trending · /new · /gainers · /losers', 'Shortcuts for the named lists (same query params).'],
  ['GET', '/api/tokens/:chain/:address', 'Token, market data, bonding curve snapshot and pools.'],
  ['GET', '/api/tokens/:chain/:address/candles?tf=', 'OHLCV candles. tf=1m|5m|15m|1h|4h|1d|1w|1M.'],
  ['GET', '/api/tokens/:chain/:address/trades', 'Recent trades.'],
  ['GET', '/api/tokens/:chain/:address/security', 'Contract checks (GoPlus) with a 0–100 score.'],
  ['GET', '/api/pairs · /api/pairs/:chain/:address', 'Trading pairs, newest first / a single pair.'],
  ['GET', '/api/search?q=', 'Tokens, pairs and creators by name, ticker, contract, pair or creator address.'],
  ['GET', '/api/transactions', 'Signed-in wallet history.'],
  ['POST', '/api/watchlist · DELETE /api/watchlist/:chain/:address', 'Server-side watchlist (signed in).'],
  ['POST', '/api/comments · /api/comments/:id/like', 'Comment / toggle like (signed in, rate limited, moderated).'],
  ['POST', '/api/reports', 'Report a token, comment or account.'],
  ['POST', '/api/launch', 'Launch a simulated token with the demo wallet. Real-wallet launches go straight from your wallet to the launchpad contract (when configured), not through this API.'],
  ['GET', '/api/stream', 'Server-sent events: price, trade, token and migration updates.'],
]

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-line pb-10 pt-2 last:border-0">
      <h2 className="font-display text-xl font-semibold tracking-tight"><a href={`#${id}`} className="hover:text-primary">{title}</a></h2>
      <div className="prose-docs mt-3 space-y-3 text-[14.5px] leading-relaxed text-muted">{children}</div>
    </section>
  )
}

export default function DocsPage() {
  return (
    <div className="grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)]">
      <nav aria-label="Documentation" className="lg:sticky lg:top-20 lg:self-start">
        <div className="label mb-3">Docs</div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm lg:flex-col">
          {TOC.map(([id, label]) => <li key={id}><a href={`#${id}`} className="text-muted hover:text-fg">{label}</a></li>)}
        </ul>
      </nav>
      <article className="max-w-3xl space-y-8">
        <header>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Achilyon documentation</h1>
          <p className="mt-2 text-muted">Everything you need to understand what you&apos;re looking at before you trade or launch.</p>
        </header>

        <Section id="getting-started" title="Getting started">
          <p>Achilyon tracks markets across Ethereum, Base, Solana, BNB Chain, Arbitrum and Polygon. Browse <Link href="/discover" className="text-primary hover:underline">Discover</Link>, open any token for charts, trades and risk signals, and star tokens to add them to your <Link href="/watchlist" className="text-primary hover:underline">watchlist</Link>.</p>
          <p>Connect a wallet to comment, sync your watchlist and see your portfolio. The <b className="text-fg">demo wallet</b> lets you try trading and launching with simulated funds — nothing touches a blockchain and everything is labelled <em>Demo Data</em>.</p>
        </Section>

        <Section id="bonding-curve" title="Bonding curve">
          <p>New Achilyon tokens start on a <b className="text-fg">constant-product bonding curve</b> with virtual reserves. With virtual quote reserve X₀ and virtual token reserve Y₀, the curve keeps <code className="rounded bg-white/5 px-1 font-mono text-fg">x · y = X₀ · Y₀</code>, so after <em>s</em> tokens are sold the spot price is <code className="rounded bg-white/5 px-1 font-mono text-fg">p(s) = k / (Y₀ − s)²</code>.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>By default 80% of supply is sold on the curve; the remainder seeds DEX liquidity at graduation. Creators may keep at most 10%.</li>
            <li>Tokens start at roughly ${DEFAULT_START_MCAP_USD.toLocaleString()} market cap (at reference quote prices) and graduate when the curve sells out.</li>
            <li>Buying costs <code className="font-mono text-fg">k/(Y₀ − s₁) − k/(Y₀ − s₀)</code> quote units plus a 1% fee; selling returns the same integral minus the fee.</li>
            <li>At graduation the raised quote and reserved tokens form a DEX pool, opened at the curve&apos;s final price with its LP tokens burned, and trading continues there. On-chain launchpad deployments use Uniswap V2; anyone can trigger graduation once the curve is complete.</li>
          </ul>
          <p>The maths lives in <code className="font-mono text-fg">src/lib/bondingCurve</code> and is unit-tested. An on-chain implementation must use integer arithmetic with the same formulas.</p>
        </Section>

        <Section id="trading" title="Trading & slippage">
          <p>Every quote shows what you receive, the minimum you&apos;ll accept after slippage, the average fill price, price impact and fees. Impact above 5% shows a warning; above 15% you must explicitly confirm.</p>
          <p>Transactions move through <em>Preparing → Confirm in wallet → Processing → Confirmed/Failed</em>. Achilyon only shows <b className="text-fg">Confirmed</b> after settlement. On-chain swaps for external wallets need a router integration that this deployment doesn&apos;t yet configure, so they are clearly marked unavailable.</p>
        </Section>

        <Section id="risk" title="Risk signals">
          <p>Token pages flag thin liquidity, very new tokens, extreme volatility, valuations far above liquidity, unusual turnover (possible wash trading), sell pressure and missing project links. Live tokens also get a contract scan (honeypot, taxes, mint/freeze authority, ownership, holder concentration) from GoPlus.</p>
          <p><b className="text-fg">These are heuristics, not guarantees.</b> A token with no warnings can still go to zero. Nothing on Achilyon is financial advice; rankings describe data, not quality.</p>
        </Section>

        <Section id="api" title="Public API">
          <p>All responses use one envelope: <code className="font-mono text-fg">{'{ ok: true, data, meta? }'}</code> or <code className="font-mono text-fg">{'{ ok: false, error: { code, message } }'}</code>. Inputs are validated; requests are rate limited per IP.</p>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead><tr className="text-[11px] uppercase tracking-wider text-subtle"><th className="border-b border-line px-3 py-2">Method</th><th className="border-b border-line px-3 py-2">Path</th><th className="border-b border-line px-3 py-2">Description</th></tr></thead>
              <tbody>
                {ENDPOINTS.map(([m, p, d]) => (
                  <tr key={p}><td className="border-b border-line px-3 py-2 font-mono text-xs text-primary">{m}</td><td className="border-b border-line px-3 py-2 font-mono text-xs text-fg">{p}</td><td className="border-b border-line px-3 py-2">{d}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="guidelines" title="Community guidelines">
          <ul className="list-disc space-y-1 pl-5">
            <li>Be respectful. No harassment, hate speech or threats.</li>
            <li>No impersonation of projects, teams or other users.</li>
            <li>No spam, repeated promotion or referral links.</li>
            <li>Never ask for — or share — private keys, seed phrases or &quot;wallet validation&quot; links. Anyone asking is a scammer.</li>
            <li>Launch only tokens you have the right to create; no copied branding.</li>
          </ul>
        </Section>

        <Section id="moderation" title="Moderation">
          <p>Comments pass automatic checks (length, link limits, repeated content, posting rate, known scam phrases). Suspicious comments are held for review; comments with several independent reports are hidden until a moderator decides.</p>
          <p>Moderators can hide comments, unverify or feature tokens and blacklist accounts. All actions require an admin session and are enforced on the server.</p>
        </Section>

        <Section id="community" title="Community">
          <p>The <Link href="/community" className="text-primary hover:underline">Community</Link> page shows live trading activity and new launches across Achilyon. Discussion happens on each token page.</p>
        </Section>

        <Section id="privacy" title="Privacy">
          <p>Watchlists, recently viewed tokens, alerts and preferences are stored in your browser. If you sign in, your watchlist, comments and launches are associated with your wallet address. Session cookies are httpOnly and contain no personal data. We never request private keys or seed phrases, and profiles show other users only activity that is already public on Achilyon.</p>
        </Section>

        <Section id="terms" title="Terms of use">
          <p>Achilyon provides market information and tooling &quot;as is&quot;, without warranties. Crypto assets are highly volatile and you can lose everything. You are responsible for your own decisions and for complying with the laws that apply to you. Demo features use simulated data and funds.</p>
        </Section>
      </article>
    </div>
  )
}
