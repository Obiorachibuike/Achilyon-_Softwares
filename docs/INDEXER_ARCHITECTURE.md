# Real-Time Market Indexer & Backend Systems Architecture

This document describes the systems architecture for turning Achilyon into a full-featured on-chain discovery terminal (hybrid of DexScreener, DEXTools, GeckoTerminal, and Nansen) with its own UX and intelligence layer.

---

## 1. System Overview

The platform is organized into three major backend systems:

```
                  +-----------------------------------+
                  |      Frontend (Next.js 16)        |
                  +-----------------+-----------------+
                                    |
                            (REST / SSE / WS)
                                    |
                  +-----------------v-----------------+
                  |       API Gateway (NestJS)        |
                  +-----------------+-----------------+
                                    |
      +-----------------------------+-----------------------------+
      |                             |                             |
+-----v---------------+    +--------v----------+    +-------------v-----+
| Wallet Intelligence |    |  Coin Discovery   |    | Real-Time Market  |
|       System        |    |      Engine       |    |     Indexer       |
+---------------------+    +-------------------+    +-------------------+
```

### 1.1 Wallet Intelligence System
- **Wallet Tracking & Portfolio:** Balances, historical P&L, real-time holdings valuation, and transaction history.
- **Contract Analysis:** Security analysis (honeypot detection, mint function flags, ownership renunciation, GoPlus integration).
- **Alerts & Transaction Monitoring:** Price thresholds, whale wallet movements, and smart money entries/exits.

### 1.2 Coin Discovery Engine
- Powers the `/coins` and `/discover` terminal views.
- Dynamic filtering by Network, DEX, Age, Liquidity, Volume, Market Cap tiers, Buys/Sells ratios, and Verified status.
- Real-time streaming updates delivered over Server-Sent Events (SSE) and WebSockets.

### 1.3 Real-Time Market Indexer
- The core indexing engine tracking multi-chain pair creations, liquidity changes, swaps, volume acceleration, metadata, and token holder balances.

---

## 2. Real-Time Coin Indexer & Worker Architecture

To scale across multiple EVM chains and Solana without bottlenecks, indexing is distributed across dedicated background workers communicating over a message queue (Redis Streams / Kafka).

```
[ Blockchain RPCs / Webhooks / External APIs ]
                      |
                      v
      +-------------------------------+
      |    Ingestion & Stream Router  |
      +---------------+---------------+
                      |
        +-------------+-------------+-------------+
        |                           |             |
        v                           v             v
+------------------+      +------------------+  +------------------+
|  Pair Discovery  |      |   Swap Worker    |  | Liquidity Worker |
|      Worker      |      |                  |  |                  |
+--------+---------+      +--------+---------+  +--------+---------+
         |                         |                     |
         +--------------------+----+---------------------+
                              |
                              v
                    +--------------------+
                    |   Holder Worker    |
                    | (Whales/Smart Mon) |
                    +---------+----------+
                              |
                              v
             +----------------+----------------+
             |                                 |
             v                                 v
   [ PostgreSQL Database ]             [ Redis Cache & Pub/Sub ]
```

### Worker Responsibilities

1. **Pair Discovery Worker**
   - Monitors factory contracts (`PairCreated`, `PoolCreated` events) across Uniswap, Aerodrome, Raydium, Orca, PancakeSwap, etc.
   - Detects newly deployed pools and launchpad curves immediately.
   - Fetches initial token metadata, decimals, total supply, and social profiles.

2. **Swap Worker**
   - Ingests `Swap` events from all tracked DEX pools.
   - Tracks 5m, 1h, 6h, and 24h rolling volume, buy transactions, sell transactions, and price changes.
   - Normalizes USD price using base/quote token liquidity weights.

3. **Liquidity Worker**
   - Tracks `Mint`, `Burn`, `Sync`, and pool reserve adjustments.
   - Computes current total value locked (TVL) / USD liquidity.
   - Flags suspicious liquidity removals (rug pulls) and liquidity lock expirations.

4. **Holder Worker**
   - Indexes `Transfer` events to calculate real-time holder balances and top 100 holder distribution.
   - Tracks smart money wallets (profitable traders, early snipers, high-win-rate addresses).
   - Generates signals: "Smart money buying", "Whale accumulation", "Whales exiting".

---

## 3. Recommended Scalable Tech Stack

```
Frontend: Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, TanStack Table, Zustand, TradingView Lightweight Charts
API Gateway: NestJS with modular microservices (Wallet, Coin, Analytics, Alerts)
Queue / Event Pipeline: Redis Streams / Apache Kafka
Persistence: PostgreSQL (Relational metadata) + Redis (Real-time caching & Pub/Sub) + TimescaleDB (Candles / Trades)
```

### Data Source Strategy

- **Phase 1 (MVP - Fast to Market):**
  - EVM Chains: DexScreener API, GeckoTerminal API, Alchemy RPC.
  - Solana: Birdeye API, Helius RPC/Webhooks.
  - Aggressive caching via Redis (15s–60s TTLs) to prevent API rate limits.
- **Phase 2 (Real-Time Streams):**
  - WebSocket feeds for price quotes and trades.
  - In-process launchpad event listener merged with live pool streams.
  - Whale tracking alerts on wallet balance changes.
- **Phase 3 (Intelligence & Advanced Features):**
  - AI summaries for token behavior (e.g. *"Token gained 320% in 6h with strong whale accumulation and increasing liquidity."*).
  - Smart money inflow tracking and copy trading triggers.

---

## 4. Database Design (Coins Table)

In addition to the relational models defined in `docs/DATABASE.md`, the high-performance discovery query engine utilizes the dedicated `coins` table:

```sql
CREATE TABLE coins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain VARCHAR(50) NOT NULL,
  dex VARCHAR(50) NOT NULL,
  contract_address TEXT NOT NULL,
  pair_address TEXT NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(24, 10) NOT NULL DEFAULT 0,
  market_cap NUMERIC(24, 2) NOT NULL DEFAULT 0,
  liquidity NUMERIC(24, 2) NOT NULL DEFAULT 0,
  volume_24h NUMERIC(24, 2) NOT NULL DEFAULT 0,
  buys_24h INT NOT NULL DEFAULT 0,
  sells_24h INT NOT NULL DEFAULT 0,
  age TIMESTAMP WITH TIME ZONE NOT NULL,
  holders INT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (chain, pair_address)
);

CREATE INDEX idx_coins_chain_dex ON coins (chain, dex);
CREATE INDEX idx_coins_market_cap ON coins (market_cap DESC);
CREATE INDEX idx_coins_liquidity ON coins (liquidity DESC);
CREATE INDEX idx_coins_volume_24h ON coins (volume_24h DESC);
CREATE INDEX idx_coins_age ON coins (age DESC);
```

---

## 5. Token Intelligence & Scoring Algorithm

The trending score is computed transparently:
$$\text{Score} = \text{Volume Acceleration (35)} + \text{Buy Pressure (25)} + \text{1h Trade Activity (20)} + \text{Liquidity Depth (20)}$$

This ensures users can inspect why a token ranks high on the Coins terminal, eliminating opaque black-box manipulation.
