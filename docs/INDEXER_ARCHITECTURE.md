# Real-Time Market Indexer & Backend Architecture

Achilyon functions as an on-chain discovery terminal (hybrid of DexScreener, DEXTools, GeckoTerminal, and Nansen) with its own UX and intelligence layer.

## 1. System Overview

The platform consists of three major systems:
1. **Wallet Intelligence System**: Wallet tracking, portfolio evaluation, contract risk analysis, price/movement alerts, and transaction lifecycle monitoring.
2. **Coin Discovery Engine**: Multi-chain streaming coins terminal with dynamic DEX selection and multi-dimensional market filters (Age, Market Cap, Liquidity, Volume, Buys/Sells ratio, Verified status).
3. **Real-Time Market Indexer**: Distributed worker network continuously indexing on-chain and DEX events across chains.

---

## 2. Worker Architecture

```
                          ┌────────────────────────┐
                          │   Blockchain RPC Nodes  │
                          │   (EVM / Solana / RPC) │
                          └───────────┬────────────┘
                                      │
                   ┌──────────────────┼──────────────────┐
                   │                  │                  │
                   ▼                  ▼                  ▼
        ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
        │  Pair Discovery  │ │   Swap Worker    │ │ Liquidity Worker │
        │      Worker      │ │  (Buys / Sells)  │ │  (Adds / Removes)│
        └─────────┬────────┘ └────────┬─────────┘ └────────┬─────────┘
                  │                   │                    │
                  └───────────────────┼────────────────────┘
                                      ▼
                        ┌────────────────────────┐
                        │   Redis Queue / Kafka  │
                        └─────────────┬──────────┘
                                      │
                   ┌──────────────────┴──────────────────┐
                   │                                     │
                   ▼                                     ▼
        ┌──────────────────┐                  ┌────────────────────┐
        │  Holder Worker   │                  │  API Gateway & SSE │
        │ (Whales / Smart) │                  │  (Real-Time Feeds) │
        └─────────┬────────┘                  └──────────┬─────────┘
                  │                                      │
                  ▼                                      ▼
        ┌──────────────────────────────────────────────────────────┐
        │           PostgreSQL Database (Coins Table)              │
        └──────────────────────────────────────────────────────────┘
```

### Worker Responsibilities

1. **Pair Discovery Worker**
   - Monitors factory contracts (`PairCreated`, `PoolCreated`, Raydium AMM / Orca Whirlpool initializations).
   - Detects new pools and token launches immediately upon block inclusion.
   - Fetches and verifies initial ERC-20 / SPL token metadata (name, symbol, decimals, total supply).

2. **Swap Worker**
   - Ingests DEX swap events (`Swap` events on Uniswap V2/V3, PancakeSwap, Aerodrome, Camelot, Trader Joe, Raydium, Orca).
   - Tracks real-time price updates, volume windows (1h, 6h, 24h), buy counts, and sell counts.
   - Calculates buy/sell pressure ratios and triggers trending algorithm re-evaluations.

3. **Liquidity Worker**
   - Monitors `Mint`, `Burn`, and liquidity provisioning events.
   - Tracks total liquidity USD, reserve changes, and liquidity locking / burn events (e.g. LP token burn to zero address).

4. **Holder Worker (Smart Money & Whale Intelligence)**
   - Tracks wallet balances, transfer flows, and top holder distributions.
   - Labels profitable traders, whales, and insiders ("Smart money buying", "Whales exiting").
   - Computes sniper percentages and holder growth momentum.

---

## 3. Database Design

### `coins` Table Schema (PostgreSQL)

```sql
CREATE TABLE coins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain VARCHAR(50) NOT NULL,
  dex VARCHAR(50) NOT NULL,
  contract_address TEXT NOT NULL,
  pair_address TEXT NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  market_cap NUMERIC NOT NULL,
  liquidity NUMERIC NOT NULL,
  volume_24h NUMERIC NOT NULL,
  buys_24h INT NOT NULL DEFAULT 0,
  sells_24h INT NOT NULL DEFAULT 0,
  age TIMESTAMP NOT NULL,
  holders INT DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Recommended indexes for real-time querying & filtering
CREATE INDEX idx_coins_chain ON coins (chain);
CREATE INDEX idx_coins_chain_dex ON coins (chain, dex);
CREATE INDEX idx_coins_market_cap ON coins (market_cap DESC);
CREATE INDEX idx_coins_volume_24h ON coins (volume_24h DESC);
CREATE INDEX idx_coins_liquidity ON coins (liquidity DESC);
CREATE INDEX idx_coins_age ON coins (age DESC);
CREATE INDEX idx_coins_contract ON coins (chain, contract_address);
```

---

## 4. Scalable Architecture Roadmap

- **Phase 1 (MVP)**:
  - Multi-chain discovery via aggregated endpoints (DexScreener API, GeckoTerminal API, GoPlus).
  - Trading terminal UI (Sidebar, dynamic FiltersBar, CoinsTable with Buys/Sells bars and Trend score).
  - Injected wallet connection + portfolio view + contract security analyzer.

- **Phase 2 (Real-Time Indexing & Streaming)**:
  - Real-time updates via Server-Sent Events (`/api/stream`) / WebSockets.
  - Independent background worker cluster consuming chain events.
  - Whale alerts and price movement monitoring.

- **Phase 3 (Intelligence & AI Layer)**:
  - Smart money inflow tracking and wallet profiling.
  - Automated AI token summaries (e.g., *"Token gained 320% in 6h with strong whale accumulation and increasing liquidity"*).
