import { z } from 'zod'
import { CHAIN_IDS, detectAddressKind } from '@/lib/blockchain/chains'
import type { ChainId } from '@/types'

/**
 * Request validation schemas shared by route handlers (server) and forms
 * (client). Keep these the single source of truth for input constraints.
 */

export const chainSchema = z.enum(CHAIN_IDS as [ChainId, ...ChainId[]])

export const addressSchema = z
  .string()
  .trim()
  .min(32)
  .max(64)
  .refine((v) => detectAddressKind(v) !== null, 'Invalid address')

export const tokenRefSchema = z.object({ chain: chainSchema, address: addressSchema })

export const timeframeSchema = z.enum(['1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M'])

export const listQuerySchema = z.object({
  chain: z.union([chainSchema, z.literal('all')]).default('all'),
  page: z.coerce.number().int().min(1).max(500).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  q: z.string().trim().max(80).optional(),
})

export const searchQuerySchema = z.object({ q: z.string().trim().min(1).max(80) })

const optionalUrl = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => !v || /^https:\/\/[^\s]+$/i.test(v), 'Must be an https:// URL')

export const tokenInfoSchema = z.object({
  name: z.string().trim().min(2, 'At least 2 characters').max(32, 'At most 32 characters').regex(/^[\p{L}\p{N} .'-]+$/u, 'Letters, numbers, spaces and . \' - only'),
  symbol: z.string().trim().min(2, 'At least 2 characters').max(10, 'At most 10 characters').regex(/^[A-Z0-9]+$/, 'Uppercase letters and numbers only'),
  description: z.string().trim().min(10, 'Tell traders what this token is (10+ characters)').max(500),
  logoDataUrl: z
    .string()
    .max(350_000, 'Logo must be under ~250KB')
    .regex(/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/, 'Logo must be a PNG, JPEG, WebP or GIF image')
    .optional(),
  website: optionalUrl,
  twitter: optionalUrl,
  telegram: optionalUrl,
  discord: optionalUrl,
})

export const tokenEconomicsSchema = z
  .object({
    totalSupply: z.number().int().min(1_000_000, 'Minimum 1M tokens').max(1_000_000_000_000, 'Maximum 1T tokens'),
    decimals: z.number().int().min(0).max(18),
    creatorAllocationPct: z.number().min(0).max(10, 'Creator allocation is capped at 10% to protect buyers'),
    curveAllocationPct: z.number().min(50).max(90),
    liquidityAllocationPct: z.number().min(10).max(50),
  })
  .refine((v) => Math.abs(v.creatorAllocationPct + v.curveAllocationPct + v.liquidityAllocationPct - 100) < 0.001, {
    message: 'Allocations must total 100%',
    path: ['liquidityAllocationPct'],
  })

export const launchSettingsSchema = z.object({
  chain: chainSchema,
  initialBuyQuote: z.number().min(0).max(1_000_000),
  slippageBps: z.number().int().min(10).max(5000),
  antiSnipeBlocks: z.number().int().min(0).max(10),
  maxWalletPct: z.number().min(0).max(100),
})

export const launchRequestSchema = z.object({
  info: tokenInfoSchema,
  economics: tokenEconomicsSchema,
  settings: launchSettingsSchema,
})

export type TokenInfoInput = z.infer<typeof tokenInfoSchema>
export type TokenEconomicsInput = z.infer<typeof tokenEconomicsSchema>
export type LaunchSettingsInput = z.infer<typeof launchSettingsSchema>
export type LaunchRequest = z.infer<typeof launchRequestSchema>

export const tradeRequestSchema = z.object({
  chain: chainSchema,
  address: addressSchema,
  side: z.enum(['buy', 'sell']),
  /** USD for buys, token amount for sells. */
  amount: z.number().positive().max(10_000_000),
  slippageBps: z.number().int().min(1).max(5000),
})
export type TradeRequest = z.infer<typeof tradeRequestSchema>

export const commentCreateSchema = z.object({
  chain: chainSchema,
  address: addressSchema,
  content: z.string().min(1, 'Write something first').max(500, 'Comments are limited to 500 characters'),
  parentId: z.string().regex(/^[a-z0-9]{6,32}$/).nullable().optional(),
})

export const reportCreateSchema = z.object({
  targetType: z.enum(['token', 'comment', 'account']),
  targetId: z.string().trim().min(3).max(120),
  reason: z.enum(['scam', 'spam', 'impersonation', 'offensive', 'other']),
  details: z.string().max(500).default(''),
})

export const watchlistAddSchema = tokenRefSchema

export const authVerifySchema = z.object({
  address: addressSchema,
  message: z.string().min(20).max(1000),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/).max(1000),
})

export const moderationActionSchema = z.object({
  action: z.enum(['resolve', 'dismiss', 'hide_comment', 'verify_token', 'unverify_token', 'feature_token', 'unfeature_token', 'blacklist', 'unblacklist']),
  targetId: z.string().trim().min(3).max(120),
  reportId: z.string().optional(),
})
