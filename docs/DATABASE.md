# Persistence design

Achilyon currently runs on **in-memory repositories**
(`src/services/db/repositories.ts`) plus the demo market engine
(`src/services/demo/engine.ts`). They are fine for local use and demos, but data
resets on restart and is not shared between server instances.

Every route handler reaches storage through the `Repositories` interface, so
moving to a real database means writing one new implementation of that
interface. No route or UI code has to change.

```ts
interface Repositories {
  comments: CommentRepository        // comments, replies (parentId), likes
  watchlists: WatchlistRepository    // per-wallet watchlists
  reports: ReportRepository          // moderation reports
  users: UserRepository              // profiles, reputation, role
  moderation: ModerationRepository   // blacklist, verified/featured/hidden, flags
  notifications: NotificationRepository
}
```

## Recommended stack

- **PostgreSQL** (Neon, Supabase or RDS) for relational data.
- **Redis/Upstash** for the rate limiter (`RateLimitStore` in
  `src/lib/security/rateLimit.ts`), the response cache, and pub/sub for the
  realtime stream across instances.
- **TimescaleDB** or ClickHouse for candles and trades once indexing starts.
  Plain Postgres partitioned by month is enough early on.

## Schema (PostgreSQL)

The domain types live in `src/types/index.ts`. Addresses are stored as they
appear on-chain, and the lookup key is `lower(address)` for EVM chains. Solana
addresses are case-sensitive and are stored unchanged.

```sql
CREATE TYPE chain_id     AS ENUM ('ethereum','base','solana','bsc','polygon','arbitrum','avalanche');
CREATE TYPE token_status AS ENUM ('bonding','migrated','listed');
CREATE TYPE user_role    AS ENUM ('user','admin');

-- Users & wallets ---------------------------------------------------------
CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  role          user_role NOT NULL DEFAULT 'user',
  reputation    INT NOT NULL DEFAULT 0,
  blacklisted   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE wallets (                        -- a user may link several wallets
  chain_kind  TEXT NOT NULL CHECK (chain_kind IN ('evm','solana')),
  address     TEXT NOT NULL,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verified_at TIMESTAMPTZ NOT NULL,           -- SIWE / SIWS signature time
  PRIMARY KEY (chain_kind, address)
);

-- Reference data ------------------------------------------------------------
CREATE TABLE networks (id chain_id PRIMARY KEY, name TEXT NOT NULL, evm_chain_id INT, explorer_url TEXT NOT NULL);
CREATE TABLE dexes    (id TEXT PRIMARY KEY, name TEXT NOT NULL, chain chain_id NOT NULL);

-- Tokens --------------------------------------------------------------------
CREATE TABLE tokens (
  chain        chain_id NOT NULL,
  address      TEXT NOT NULL,
  name         TEXT NOT NULL,
  symbol       TEXT NOT NULL,
  decimals     SMALLINT NOT NULL,
  total_supply NUMERIC(78,0) NOT NULL,        -- raw units; never float
  status       token_status NOT NULL,
  launchpad    BOOLEAN NOT NULL DEFAULT FALSE,
  creator      TEXT,
  verified     BOOLEAN NOT NULL DEFAULT FALSE,
  featured     BOOLEAN NOT NULL DEFAULT FALSE,
  hidden       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (chain, address)
);
CREATE INDEX tokens_symbol_trgm ON tokens USING gin (symbol gin_trgm_ops);
CREATE INDEX tokens_name_trgm   ON tokens USING gin (name gin_trgm_ops);
CREATE INDEX tokens_creator     ON tokens (creator);

CREATE TABLE token_metadata (                 -- user-editable, moderated
  chain chain_id, address TEXT,
  description TEXT CHECK (length(description) <= 500),
  logo_url TEXT, website TEXT, twitter TEXT, telegram TEXT, discord TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chain, address),
  FOREIGN KEY (chain, address) REFERENCES tokens ON DELETE CASCADE
);

CREATE TABLE token_launches (                 -- bonding-curve launches
  chain chain_id, address TEXT,
  curve_kind TEXT NOT NULL,                   -- 'constant-product' | 'linear'
  curve_supply NUMERIC(78,0) NOT NULL,
  virtual_token_reserve NUMERIC NOT NULL,
  virtual_quote_reserve NUMERIC NOT NULL,
  fee_bps INT NOT NULL,
  tokens_sold NUMERIC NOT NULL DEFAULT 0,
  quote_raised NUMERIC NOT NULL DEFAULT 0,
  migrated_at TIMESTAMPTZ,
  deploy_tx_hash TEXT NOT NULL,               -- written only after a confirmed receipt
  PRIMARY KEY (chain, address),
  FOREIGN KEY (chain, address) REFERENCES tokens
);

CREATE TABLE trading_pairs (
  chain chain_id, address TEXT,
  dex_id TEXT REFERENCES dexes(id),
  base_token TEXT NOT NULL, quote_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (chain, address)
);
CREATE INDEX pairs_base ON trading_pairs (chain, base_token);

-- Market data (time series) ------------------------------------------------
CREATE TABLE price_snapshots (                -- latest aggregates, 1 row per pair
  chain chain_id, pair TEXT,
  price_usd NUMERIC NOT NULL, liquidity_usd NUMERIC, market_cap NUMERIC, fdv NUMERIC,
  volume_24h NUMERIC, change_1h REAL, change_24h REAL, holders INT,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (chain, pair)
);
CREATE TABLE candles (
  chain chain_id, pair TEXT, timeframe TEXT, open_time TIMESTAMPTZ,
  open NUMERIC, high NUMERIC, low NUMERIC, close NUMERIC, volume_usd NUMERIC,
  PRIMARY KEY (chain, pair, timeframe, open_time)
);                                            -- hypertable / monthly partitions
CREATE TABLE transactions (                   -- indexed swaps and launches
  chain chain_id, hash TEXT, log_index INT,
  pair TEXT, token TEXT, wallet TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy','sell','launch')),
  amount_token NUMERIC NOT NULL, amount_usd NUMERIC NOT NULL, price_usd NUMERIC NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','confirmed','failed')),
  block_time TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (chain, hash, log_index)
);
CREATE INDEX tx_wallet ON transactions (wallet, block_time DESC);
CREATE INDEX tx_token  ON transactions (chain, token, block_time DESC);

CREATE TABLE holdings (                       -- derived from transfers by the indexer
  chain chain_id, token TEXT, wallet TEXT, amount NUMERIC(78,0) NOT NULL,
  cost_basis_usd NUMERIC, updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (chain, token, wallet)
);

-- Social --------------------------------------------------------------------
CREATE TABLE watchlist_entries (
  user_id BIGINT REFERENCES users ON DELETE CASCADE,
  chain chain_id, address TEXT, added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, chain, address)
);
CREATE TABLE comments (                       -- replies: parent_id NOT NULL
  id TEXT PRIMARY KEY,
  chain chain_id NOT NULL, token TEXT NOT NULL,
  parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 500),  -- plain text, sanitized
  status TEXT NOT NULL CHECK (status IN ('visible','hidden','flagged')),
  like_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX comments_token ON comments (chain, token, created_at DESC);
CREATE INDEX comments_author ON comments (author, created_at DESC);  -- flood/duplicate checks
CREATE TABLE comment_likes (
  comment_id TEXT REFERENCES comments ON DELETE CASCADE, wallet TEXT,
  PRIMARY KEY (comment_id, wallet)
);
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('token','comment','account')),
  target_id TEXT NOT NULL, reporter TEXT NOT NULL,
  reason TEXT NOT NULL, details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (target_type, target_id, reporter)   -- one report per reporter per target
);
CREATE TABLE moderation_log (                 -- append-only audit trail
  id BIGSERIAL PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL,
  target_id TEXT NOT NULL, report_id TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE notifications (
  id TEXT PRIMARY KEY, user_id BIGINT REFERENCES users ON DELETE CASCADE,
  kind TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, href TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user ON notifications (user_id, created_at DESC);
```

A "creator" is not a separate table. It is a view over
`tokens GROUP BY creator` joined to `users` through `wallets`.

## Rules to keep when migrating

1. **Never store private keys or seed phrases.** Only public addresses and
   signature timestamps.
2. Store token amounts as `NUMERIC(78,0)` raw units. Convert to decimals only for
   display.
3. Write `token_launches.deploy_tx_hash`, and `transactions` rows with
   `status='confirmed'`, only after a receipt has been observed. This is the
   same rule the client state machine enforces.
4. Comments are plain text. Keep running `sanitizeText` and `moderate()` before
   insert, and never render comments as HTML.
5. Every moderation action writes to `moderation_log`.
