import 'server-only'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'

/**
 * Server-side environment, validated once at first use. Secrets defined here
 * never reach the browser bundle (this module is `server-only`).
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters').optional(),
  ADMIN_ADDRESSES: z.string().default(''),
  DEXSCREENER_API_BASE: z.string().url().default('https://api.dexscreener.com'),
  GECKOTERMINAL_API_BASE: z.string().url().default('https://api.geckoterminal.com/api/v2'),
  GOPLUS_API_BASE: z.string().url().default('https://api.gopluslabs.io/api/v1'),
  MARKET_QUERIES: z.string().default('SOL,WETH,USDC,PEPE,BONK,WIF,BRETT,AERO,ARB,DEGEN'),
  RPC_URL_ETHEREUM: z.string().url().optional(),
  RPC_URL_BASE: z.string().url().optional(),
  RPC_URL_ARBITRUM: z.string().url().optional(),
  RPC_URL_POLYGON: z.string().url().optional(),
  RPC_URL_BSC: z.string().url().optional(),
  RPC_URL_AVALANCHE: z.string().url().optional(),
})

export type ServerEnv = z.infer<typeof schema> & { sessionSecret: string; adminAddresses: string[] }

let cached: ServerEnv | null = null

export function serverEnv(): ServerEnv {
  if (cached) return cached
  // Treat `KEY=` (empty, as in a freshly copied .env.example) as unset.
  const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined && v.trim() !== ''))
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(`Invalid server environment:\n${parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')}`)
  }
  const env = parsed.data
  let sessionSecret = env.SESSION_SECRET
  if (!sessionSecret) {
    if (env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
      throw new Error('SESSION_SECRET is required in production. Generate one with `openssl rand -hex 32`.')
    }
    // Development fallback: random per process, so sessions reset on restart.
    sessionSecret = randomBytes(32).toString('hex')
    console.warn('[achilyon] SESSION_SECRET not set — using an ephemeral development secret.')
  }
  cached = {
    ...env,
    sessionSecret,
    adminAddresses: env.ADMIN_ADDRESSES.split(',').map((a) => a.trim().toLowerCase()).filter(Boolean),
  }
  return cached
}
