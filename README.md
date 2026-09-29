# Achilyon

**Discover, launch and trade emerging crypto markets.**

Achilyon is a token discovery, launch and trading-analytics platform built with
Next.js. It covers several chains: live market tables with transparent trending
scores, token pages with interactive charts and a trading panel, a
bonding-curve token launchpad, and a moderated community layer.

> ⚠️ **Demo mode is on by default.** All prices, trades, launches and balances are
> simulated by an in-process market engine and labelled **Demo Data** in the UI.
> No transaction is broadcast and no real funds are involved. Nothing here is
> financial advice.

## Features

| Area | What it does |
| --- | --- |
| **Discover** (`/`, `/discover`) | Live market strip, trending, new tokens, new pairs, gainers, losers and recently viewed. The full market table sorts, filters (network, market cap, liquidity, volume, age, change, DEX, status, verified) and paginates, with the state kept in the URL. |
| **Trending** (`/trending`) | Transparent scores that show their component breakdown (volume, momentum, activity, liquidity, buy pressure, discussion), with Hot, Fastest-growing, Most-discussed and Viral sections. |
| **Lists** | `/new`, `/pairs`, `/gainers`, `/losers`, all built on the reusable `TokenTable` and `FilterBar`. |
| **Token page** (`/token/[chain]/[address]`) | Candlestick/line chart from 1m to 1M in price, market-cap, liquidity or volume mode. Also: metrics, bonding-curve progress, security checks, live activity, holders and threaded comments (replies, likes, report, sort). Titles are dynamic, e.g. `ACH / USDC — Achilyon`. |
| **Trading panel** | BUY/SELL with 25/50/75/MAX, price impact, minimum received, fee and slippage. Transactions move through Preparing → Confirm in wallet → Processing → Confirmed/Failed. On an on-chain launchpad token, a browser wallet trades against the contract: exact quotes, a slippage floor, a deadline, and a single-transaction sell via `permit`. |
| **Launch** (`/launch`) | 6-step wizard: details, socials, tokenomics, settings, review, deploy. Validation is shared with the server, drafts are saved locally, and the curve preview uses the real maths. With a browser wallet on a network that has a launchpad deployment, the final step sends a real `createToken` transaction. |
| **On-chain launchpad** (`contracts/`) | A Solidity bonding-curve factory, an ERC-20 with permit, and a Uniswap V2 migrator that graduates completed curves into a pool with burned LP. Tested on an in-process EVM against the official Uniswap V2 bytecode. It turns on per chain via `NEXT_PUBLIC_LAUNCHPAD_DEPLOYMENTS`. Launches, trades and graduations are read back from the chain into every list, chart and activity feed. Graduated tokens are priced from their pool. See [`contracts/README.md`](contracts/README.md). |
| **Portfolio / Transactions** | Holdings, P&L and transaction history for the connected wallet, with explorer links for real chains. |
| **Watchlist & alerts** | The watchlist lives in localStorage and syncs to the server when signed in. Price and 24h-change alerts fire as in-app and browser notifications. |
| **Analyzer** (`/analyzer`) | Contract risk score (GoPlus data in live mode). |
| **Profiles** | `/profile/[address]` and `/my-tokens` show created tokens, activity and reputation. |
| **Moderation** (`/admin`) | RBAC-gated console for reports, hiding comments, verifying/featuring tokens and blacklisting. |
| **Global search** | `⌘K` / `Ctrl+K`, debounced, keyboard-navigable. Searches name, ticker, contract, pair and creator. |
| **Platform** | PWA manifest with an offline page, SEO (OG/Twitter, canonical, sitemap, robots), a responsive shell with a mobile bottom nav, accessible gain/loss (arrow + sign, not colour alone) and reduced-motion support. |

## Getting started

Requires **Node ≥ 20.9**.

```bash
npm install
cp .env.example .env.local   # optional — every variable has a default
npm run dev                  # http://localhost:3000
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server (Turbopack) |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` | ESLint (zero warnings allowed) |
| `npm run typecheck` | `tsc --noEmit` (strict, `noUncheckedIndexedAccess`) |
| `npm test` | Vitest unit, route-handler and contract (EVM) tests |
| `npm run contracts:build` | Compile Solidity → `contracts/artifacts/` + `src/lib/contracts/abi.ts` |
| `npm run contracts:deploy` | Deploy the launchpad from your shell (see [`contracts/README.md`](contracts/README.md#deploying); `--dry-run` first) |

> `npm start` runs with `NODE_ENV=production`, which **requires `SESSION_SECRET`**
> (sign-in fails closed without it):
> `SESSION_SECRET=$(openssl rand -hex 32) npm start`

### Environment

See [`.env.example`](.env.example). Summary:

| Variable | Scope | Default | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_DEMO_MODE` | public | `true` | Simulated engine (`true`) or live DexScreener/GeckoTerminal data (`false`) |
| `NEXT_PUBLIC_APP_URL` | public | `http://localhost:3000` | Canonical URL for metadata/sitemap |
| `NEXT_PUBLIC_DEFAULT_CHAIN` | public | `base` | Default network |
| `NEXT_PUBLIC_DEMO_STARTING_BALANCE` | public | `10000` | Demo wallet cash (USD) |
| `SESSION_SECRET` | server | ephemeral in dev | Session cookie HMAC key. **Required in production** (≥ 32 chars) |
| `ADMIN_ADDRESSES` | server | — | Comma-separated admin wallets |
| `DEXSCREENER_API_BASE`, `GECKOTERMINAL_API_BASE`, `GOPLUS_API_BASE` | server | public endpoints | Data provider base URLs |
| `MARKET_QUERIES` | server | preset | Live-mode market universe seeds |
| `NEXT_PUBLIC_LAUNCHPAD_DEPLOYMENTS` | public | — | JSON map of chain → launchpad address (`{"base":{"address":"0x…","startBlock":123,"dexName":"Uniswap V2"}}`). Turns on-chain launch and trading on for those chains only |
| `RPC_URL_*` | server | public RPCs | Server-side balance reads and launchpad log reads. **Required for testnet deployments** (they never fall back to a mainnet RPC) |

Server variables are validated at startup (`src/lib/env.server.ts`) and are
never shipped to the browser.

## Architecture

```
src/
  app/                 Next.js App Router pages + API route handlers (app/api/*)
  components/          ui/ primitives, shell/ (sidebar, topbar, search), token/ (TokenTable, FilterBar, …)
  features/            Page-level feature modules (market, token, launch, portfolio, admin, …)
  lib/
    bondingCurve/      Curve config, pricing models (constant-product, linear), buy/sell quotes
    contracts/         Launchpad ABI (generated), exact bigint curve port, viem client, log reader, deployments config
    market/            Filters, sorting, search ranking, trending scores, AMM + trade quotes, risk
    blockchain/        Chain registry and facades: tokens, pairs, transactions, wallets, explorers
    transactions/      Transaction lifecycle state machine
    wallet/            Wallet connectors (injected EIP-1193 + demo) and reducer
    security/          Sanitization, moderation hooks, rate limiting
    api/               zod schemas, route toolkit (envelopes, guards, CSRF), typed client
  services/
    demo/engine.ts     Deterministic simulated market (prices, trades, launches, balances)
    providers/         Demo, DexScreener, GeckoTerminal, GoPlus adapters behind one interface;
                       launchpadProvider merges on-chain launches into whichever is active
    db/                Repository interfaces + in-memory implementation
    auth/              Signed-cookie sessions (SIWE-style message signing)
  stores/ hooks/ providers/   Client state (zustand), React Query hooks, realtime (SSE)
  data/mock/           Seeded mock catalog
  types/               Domain model types
contracts/             Solidity sources, committed artifacts, compile/build/deploy tooling
```

**Data flow.** UI → React Query → `/api/*` route handlers → `lib/blockchain/*`
facades → provider (demo engine or live APIs). Realtime updates stream over SSE
from `/api/stream`.

**API.** Every response uses one envelope:
`{ ok: true, data, meta? }` or `{ ok: false, error: { code, message, details? } }`.
The main endpoints are:

- `GET /api/tokens` (with `trending|new|gainers|losers` variants), `/api/tokens/:chain/:address` (plus `/candles`, `/trades`, `/security`)
- `GET /api/pairs`, `/api/pairs/:chain/:address`, `/api/search?q=`, `/api/transactions`
- `POST /api/watchlist`, `DELETE /api/watchlist/:chain/:address`, `POST /api/comments`, `POST /api/reports`, `POST /api/launch`, `POST /api/trade`

The full list, with parameters, is on the in-app `/docs` page.

**Bonding curve.** The default is a virtual-reserve constant product,
`(x₀ + sold)·(y₀ + raised) = k`, with a 1% fee. Buys that would exceed the
remaining curve supply are clipped and the excess is refunded. The curve
graduates when its supply sells out. The maths lives in `src/lib/bondingCurve`
and is covered by tests.

## Security

- Wallets connect through the user's own wallet. Achilyon never asks for,
  stores or transmits private keys or seed phrases.
- The UI never reports a transaction as successful unless it was confirmed.
  The state machine only reaches `confirmed` from `processing`, and on-chain
  flows reach it only after a successful receipt. Every write is simulated
  first, so a transaction that would revert fails with a readable reason before
  the wallet is asked to sign. Real-wallet trades and launches work only on
  chains listed in `NEXT_PUBLIC_LAUNCHPAD_DEPLOYMENTS`. Everywhere else the UI
  says they are unavailable instead of faking them.
- Deployment keys are read only by the `contracts:deploy` CLI from its own
  environment. The web app never handles private keys.
- All inputs are validated with zod on the server. Writes need a same-origin
  check (CSRF) and a signed session. Requests are rate-limited per IP and route.
- User content is stored and rendered as plain text. Bidi and zero-width
  characters are stripped. Only `https://` URLs are accepted for links.
  Moderation hooks catch floods, duplicates, link spam and phishing phrases.
- The app sends security headers from `next.config.ts`: `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` and HSTS. A
  nonce-based CSP is still on the roadmap.

## Testing

`npm test` runs:

- bonding-curve maths
- AMM and trade quotes
- formatting
- filters and URL round-trips
- search ranking
- sorting and scoring
- sanitization, moderation and rate limiting
- schema validation and launch-draft validation
- the transaction state machine
- the wallet reducer
- alerts
- env validation
- integration tests that call the real API route handlers: envelopes, validation errors, auth, CSRF, demo trades and launches
- **contracts on an in-process EVM (Hardhat EDR):**
  - A differential fuzz against the TypeScript curve port.
  - Slippage, deadline, reentrancy, pause and fee tests.
  - The viem client driving the tx state machine, including wallet rejection, simulate-first failures and network switching.
  - The event-log market reader.
  - The deploy script.

## Known limitations

- **Contracts are unaudited and not deployed.** On-chain launch and trading
  need you to deploy the launchpad and set `NEXT_PUBLIC_LAUNCHPAD_DEPLOYMENTS`.
  Anti-snipe and max-wallet settings are **not** enforced on-chain.
- **After graduation, trading moves to the DEX.** Achilyon does not route swaps
  in-app, so the token page links to the pool on the explorer. The price and
  liquidity shown come from the pool's reserves. Pool swaps aren't indexed, so
  the chart, volume and activity feed stop at graduation. Graduation needs
  someone to send the `migrate` transaction, and the token page offers a button
  for it.
- **On-chain history comes from recent logs.** The reader scans the last
  ~500k blocks from `startBlock` and lists the newest 100 launches per chain.
  Older history, holder counts and a real wallet's full activity need an
  indexer.
- WalletConnect and Coinbase connectors are designed for but disabled until a
  project ID and SDK are added.
- **In-memory persistence.** Comments, reports, watchlists and demo balances
  reset on restart and are per-instance. See [`docs/DATABASE.md`](docs/DATABASE.md)
  for the Postgres schema and migration plan.
- **Live mode** uses public, rate-limited APIs. Holder counts and some metrics
  are unavailable there.
- **Realtime** SSE is per-instance. Multi-instance deployments need Redis
  pub/sub.

## Roadmap

1. Deploy the launchpad and migrator to a testnet (`npm run contracts:deploy`,
   see [`contracts/README.md`](contracts/README.md#deploying)). Then get an
   audit before mainnet. Port the design to a Solana program after that.
2. Move to a Postgres + Redis implementation of `Repositories` and
   `RateLimitStore`.
3. Build a chain indexer for trades, holders and candles, including
   post-graduation pool swaps, and add in-app DEX swap routing.
4. Enable WalletConnect/Coinbase connectors and add SIWS for Solana.
5. Add a moderation audit log UI, appeal flow and creator verification.
6. Add a nonce-based Content-Security-Policy via middleware.
