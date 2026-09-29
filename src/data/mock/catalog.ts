import type { ChainId, TokenStatus } from '@/types'

/**
 * Demo token catalog. Every name, ticker and project here is fictional and
 * exists only to exercise the product in demo mode.
 */
export interface CatalogEntry {
  symbol: string
  name: string
  chain: ChainId
  status: TokenStatus
  verified?: boolean
  featured?: boolean
  description: string
  /** Approximate market cap in USD for listed tokens. */
  mcap?: number
  /** Curve progress 0–1 for bonding tokens. */
  progress?: number
  /** Age in hours. */
  ageHours: number
  socials?: ('website' | 'twitter' | 'telegram' | 'discord')[]
  dex?: string
}

export const CATALOG: CatalogEntry[] = [
  { symbol: 'ACH', name: 'Achilyon', chain: 'base', status: 'listed', verified: true, featured: true, mcap: 48_200_000, ageHours: 24 * 210, dex: 'aerodrome', socials: ['website', 'twitter', 'telegram', 'discord'], description: 'Utility token of the Achilyon platform: launch-fee discounts, curator staking and governance over featured listings.' },
  { symbol: 'MOVA', name: 'Movara', chain: 'solana', status: 'migrated', verified: true, featured: true, mcap: 6_400_000, ageHours: 24 * 12, dex: 'raydium', socials: ['website', 'twitter', 'telegram'], description: 'Community-run motion graphics collective that graduated from an Achilyon curve. Holders vote on the weekly art drop.' },
  { symbol: 'NOVA', name: 'Nova Protocol', chain: 'ethereum', status: 'listed', verified: true, mcap: 212_000_000, ageHours: 24 * 540, dex: 'uniswap', socials: ['website', 'twitter', 'discord'], description: 'Intent-based settlement layer that routes cross-chain orders to solvers competing on execution quality.' },
  { symbol: 'PULSE', name: 'Pulse Network', chain: 'arbitrum', status: 'listed', verified: true, mcap: 31_700_000, ageHours: 24 * 160, dex: 'camelot', socials: ['website', 'twitter', 'telegram'], description: 'Real-time oracle network streaming sub-second price feeds to perpetual DEXs.' },
  { symbol: 'ZEN', name: 'Zenith', chain: 'bsc', status: 'listed', verified: false, mcap: 9_800_000, ageHours: 24 * 75, dex: 'pancakeswap', socials: ['website', 'telegram'], description: 'Yield aggregator that auto-compounds stablecoin LP positions across BNB Chain farms.' },
  { symbol: 'ORBT', name: 'Orbital', chain: 'base', status: 'listed', verified: true, mcap: 18_400_000, ageHours: 24 * 90, dex: 'uniswap', socials: ['website', 'twitter'], description: 'On-chain options vaults with automated covered-call strategies.' },
  { symbol: 'KAIRO', name: 'Kairo', chain: 'solana', status: 'listed', verified: true, mcap: 74_000_000, ageHours: 24 * 300, dex: 'orca', socials: ['website', 'twitter', 'discord'], description: 'Consumer payments app that settles card purchases in stablecoins on Solana.' },
  { symbol: 'LUMA', name: 'Lumen AI', chain: 'ethereum', status: 'listed', verified: false, mcap: 5_200_000, ageHours: 24 * 21, dex: 'uniswap', socials: ['website', 'twitter'], description: 'Decentralized GPU marketplace for fine-tuning open models.' },
  { symbol: 'VRTX', name: 'Vertex Labs', chain: 'arbitrum', status: 'listed', verified: true, mcap: 41_000_000, ageHours: 24 * 400, dex: 'uniswap', socials: ['website', 'twitter', 'discord'], description: 'Hybrid orderbook-AMM exchange with cross-margin accounts.' },
  { symbol: 'HALO', name: 'Halo Finance', chain: 'polygon', status: 'listed', verified: false, mcap: 2_900_000, ageHours: 24 * 45, dex: 'quickswap', socials: ['website'], description: 'Undercollateralized lending pools for on-chain businesses with verified revenue.' },
  { symbol: 'DRIFT', name: 'Driftwood', chain: 'base', status: 'listed', verified: false, mcap: 1_150_000, ageHours: 60, dex: 'aerodrome', socials: ['twitter'], description: 'Social trading token for the Driftwood surf-club community.' },
  { symbol: 'SOLR', name: 'Solaris', chain: 'solana', status: 'listed', verified: false, mcap: 12_600_000, ageHours: 24 * 33, dex: 'meteora', socials: ['website', 'twitter', 'telegram'], description: 'Tokenized solar-farm revenue shares with monthly on-chain distributions.' },
  { symbol: 'ONYX', name: 'Onyx', chain: 'ethereum', status: 'listed', verified: true, mcap: 96_000_000, ageHours: 24 * 700, dex: 'uniswap', socials: ['website', 'twitter'], description: 'Privacy-preserving identity attestations for DeFi compliance.' },
  { symbol: 'QUASR', name: 'Quasar', chain: 'avalanche', status: 'listed', verified: false, mcap: 3_700_000, ageHours: 24 * 58, dex: 'traderjoe', socials: ['website', 'discord'], description: 'Gaming subnet token powering a space-strategy MMO.' },
  { symbol: 'EMBR', name: 'Ember', chain: 'bsc', status: 'listed', verified: false, mcap: 640_000, ageHours: 30, dex: 'pancakeswap', socials: ['telegram'], description: 'Deflationary meme token with a weekly burn ritual.' },
  { symbol: 'TIDE', name: 'Tidal', chain: 'arbitrum', status: 'listed', verified: false, mcap: 7_300_000, ageHours: 24 * 26, dex: 'camelot', socials: ['website', 'twitter'], description: 'Liquid restaking token aggregator with auto-rebalancing.' },
  { symbol: 'AXIS', name: 'Axis', chain: 'polygon', status: 'listed', verified: true, mcap: 22_500_000, ageHours: 24 * 260, dex: 'uniswap', socials: ['website', 'twitter', 'discord'], description: 'Supply-chain provenance tokens used by specialty coffee roasters.' },
  { symbol: 'NEON', name: 'Neon Koi', chain: 'solana', status: 'listed', verified: false, mcap: 880_000, ageHours: 18, dex: 'raydium', socials: ['twitter', 'telegram'], description: 'Cyberpunk koi meme with an on-chain pond of generative fish.' },
  { symbol: 'GLIM', name: 'Glimmer', chain: 'base', status: 'migrated', verified: false, mcap: 1_900_000, ageHours: 24 * 4, dex: 'uniswap', socials: ['twitter', 'telegram'], description: 'Firefly meme that completed its Achilyon curve in under six hours.' },
  { symbol: 'PIXL', name: 'Pixel Pals', chain: 'solana', status: 'migrated', verified: false, mcap: 2_400_000, ageHours: 24 * 7, dex: 'raydium', socials: ['website', 'twitter'], description: 'Tamagotchi-style pixel pets you feed with on-chain actions.' },
  { symbol: 'BLOB', name: 'Blobfish', chain: 'base', status: 'migrated', verified: false, mcap: 540_000, ageHours: 40, dex: 'uniswap', socials: ['twitter'], description: 'The ugliest fish in the sea, now with a treasury.' },
  { symbol: 'MOCHI', name: 'Mochi', chain: 'solana', status: 'migrated', verified: false, mcap: 3_100_000, ageHours: 24 * 9, dex: 'raydium', socials: ['website', 'twitter', 'telegram'], description: 'Soft, round and community-owned. Mochi funds local artists every month.' },
  { symbol: 'OTTR', name: 'Otter Club', chain: 'arbitrum', status: 'migrated', verified: false, mcap: 760_000, ageHours: 24 * 3, dex: 'camelot', socials: ['twitter', 'discord'], description: 'Otters holding hands so they never drift apart.' },
  { symbol: 'SPRK', name: 'Spark', chain: 'base', status: 'bonding', progress: 0.86, ageHours: 5, socials: ['twitter', 'telegram'], description: 'Tiny spark, big fire. Approaching curve completion.' },
  { symbol: 'BYTE', name: 'Bytecat', chain: 'solana', status: 'bonding', progress: 0.62, ageHours: 3, socials: ['twitter'], description: 'A cat that lives in your RAM and eats stray bits.' },
  { symbol: 'FROG', name: 'Frogverse', chain: 'solana', status: 'bonding', progress: 0.41, ageHours: 2, socials: ['website', 'twitter', 'telegram'], description: 'A multiverse of frogs, each minted by a holder vote.' },
  { symbol: 'KOI', name: 'Lucky Koi', chain: 'bsc', status: 'bonding', progress: 0.23, ageHours: 1.5, socials: ['telegram'], description: 'Fortune favors the koi.' },
  { symbol: 'RKT', name: 'Rocketeer', chain: 'base', status: 'bonding', progress: 0.73, ageHours: 7, socials: ['twitter'], description: 'Strapping a jetpack to the timeline.' },
  { symbol: 'MOON', name: 'Moonpaw', chain: 'ethereum', status: 'bonding', progress: 0.12, ageHours: 0.8, socials: [], description: 'A paw print on the moon. No roadmap, just vibes.' },
  { symbol: 'CHAD', name: 'Chadwick', chain: 'solana', status: 'bonding', progress: 0.95, ageHours: 9, socials: ['twitter', 'telegram'], description: 'Chadwick never sells. Almost graduated.' },
  { symbol: 'YETI', name: 'Yeti Snow', chain: 'arbitrum', status: 'bonding', progress: 0.34, ageHours: 4, socials: ['twitter'], description: 'Big feet, cold hands, warm community.' },
  { symbol: 'JELLY', name: 'Jellybean', chain: 'base', status: 'bonding', progress: 0.05, ageHours: 0.3, socials: [], description: 'Every flavor at once.' },
  { symbol: 'NIMB', name: 'Nimbus', chain: 'polygon', status: 'bonding', progress: 0.48, ageHours: 6, socials: ['website', 'twitter'], description: 'Cloud-shaped mascot for a weather-prediction mini game.' },
  { symbol: 'DUNE', name: 'Dune Rider', chain: 'solana', status: 'bonding', progress: 0.57, ageHours: 11, socials: ['twitter'], description: 'Sand, speed and a sandworm treasury.' },
  { symbol: 'FIZZ', name: 'Fizz', chain: 'bsc', status: 'bonding', progress: 0.18, ageHours: 2.5, socials: ['telegram'], description: 'Pop the cap.' },
  { symbol: 'COMET', name: 'Comet Tail', chain: 'base', status: 'bonding', progress: 0.29, ageHours: 1.2, socials: ['twitter', 'telegram'], description: 'Following the brightest tail in the sky.' },
  { symbol: 'ZAP', name: 'Zapper Bug', chain: 'solana', status: 'bonding', progress: 0.08, ageHours: 0.5, socials: [], description: 'Bzzzt.' },
  { symbol: 'PLUM', name: 'Plum', chain: 'ethereum', status: 'bonding', progress: 0.66, ageHours: 14, socials: ['website', 'twitter'], description: 'Juicy, purple, slightly overripe.' },
]

/** Name pool for tokens spawned by the live demo simulation. */
export const SPAWN_POOL: { symbol: string; name: string; description: string }[] = [
  { symbol: 'WISP', name: 'Wisp', description: 'A little ghost that haunts the mempool.' },
  { symbol: 'BRIX', name: 'Brix', description: 'Building something, one brick at a time.' },
  { symbol: 'HOOT', name: 'Night Owl', description: 'For traders who never sleep.' },
  { symbol: 'TOFU', name: 'Tofu', description: 'Absorbs the flavor of the market.' },
  { symbol: 'GUMBO', name: 'Gumbo', description: 'A community stew with everything in it.' },
  { symbol: 'PEBL', name: 'Pebble', description: 'Small, smooth, underrated.' },
  { symbol: 'VOLT', name: 'Voltage', description: 'High-voltage meme energy.' },
  { symbol: 'MUSH', name: 'Mushie', description: 'Grows in the dark, fruits overnight.' },
  { symbol: 'CRAB', name: 'Sidestep Crab', description: 'Only moves sideways. Just like the market.' },
  { symbol: 'LOOP', name: 'Loopy', description: 'Round and round we go.' },
]

export const COMMENT_POOL = [
  'Curve is moving fast today 👀',
  'Dev has been active in the Telegram all morning.',
  'Liquidity is still thin — size your entries carefully.',
  'Chart looks like it is consolidating before the next leg.',
  'Who else is here from the Discover feed?',
  'Anyone checked the holder distribution yet?',
  'Love the art on this one.',
  'Reminder: nothing here is financial advice.',
  'Volume picked up in the last hour.',
  'Waiting for migration before adding more.',
  'Took some profit, still holding a bag.',
  'The website is clean, team seems serious.',
  'Top holder concentration is a bit high for me.',
  'GM to all holders ☀️',
  'This community is surprisingly wholesome.',
]
