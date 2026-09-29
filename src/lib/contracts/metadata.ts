import { z } from 'zod'
import { safeUrl, sanitizeText } from '@/lib/security/sanitize'

/**
 * Token metadata for on-chain launches travels in the `TokenCreated` event as
 * a compact `data:application/json;base64,…` URI (≤ 2 KB — the contract's
 * MAX_METADATA_BYTES). Nothing is stored off-chain, so any indexer can
 * reconstruct it. Logos need IPFS pinning and are not included yet.
 *
 * Decoding treats the payload as untrusted: it is size-limited, schema-checked
 * and sanitized, and never throws.
 */

export const MAX_METADATA_BYTES = 2048
const PREFIX = 'data:application/json;base64,'

export interface TokenMetadata {
  description?: string
  website?: string
  twitter?: string
  telegram?: string
  discord?: string
}

const schema = z.object({
  v: z.literal(1),
  description: z.string().max(1000).optional(),
  website: z.string().max(300).optional(),
  twitter: z.string().max(300).optional(),
  telegram: z.string().max(300).optional(),
  discord: z.string().max(300).optional(),
})

function toBase64(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function fromBase64(b64: string): string {
  const bin = atob(b64)
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

const httpsOnly = (u: string | undefined) => {
  const url = safeUrl(u)
  return url?.startsWith('https://') ? url : undefined
}

export function encodeMetadata(m: TokenMetadata): string {
  const payload: Record<string, unknown> = { v: 1 }
  if (m.description) payload.description = m.description
  for (const k of ['website', 'twitter', 'telegram', 'discord'] as const) if (m[k]) payload[k] = m[k]
  const uri = PREFIX + toBase64(JSON.stringify(payload))
  if (new TextEncoder().encode(uri).length > MAX_METADATA_BYTES) throw new Error('Token metadata is too large for an on-chain launch — shorten the description')
  return uri
}

export function decodeMetadata(uri: string | null | undefined): TokenMetadata {
  if (!uri || !uri.startsWith(PREFIX) || uri.length > MAX_METADATA_BYTES) return {}
  try {
    const parsed = schema.safeParse(JSON.parse(fromBase64(uri.slice(PREFIX.length))))
    if (!parsed.success) return {}
    const d = parsed.data
    return {
      description: d.description ? sanitizeText(d.description, 500) : undefined,
      website: httpsOnly(d.website),
      twitter: httpsOnly(d.twitter),
      telegram: httpsOnly(d.telegram),
      discord: httpsOnly(d.discord),
    }
  } catch {
    return {}
  }
}
