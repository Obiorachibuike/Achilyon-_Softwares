import { countLinks } from './sanitize'

/**
 * Pluggable moderation pipeline. Each hook inspects content and returns a
 * verdict; the strictest verdict wins. Swap or extend hooks (e.g. call an
 * external moderation API) without touching route handlers.
 */

export type Verdict = 'allow' | 'flag' | 'reject'

export interface ModerationResult {
  verdict: Verdict
  reasons: string[]
}

export interface ModerationContext {
  author: string
  content: string
  recentByAuthor: { content: string; createdAt: number }[]
  blacklisted: boolean
  now: number
}

export type ModerationHook = (ctx: ModerationContext) => { verdict: Verdict; reason?: string }

const SCAM_PATTERNS = [/seed\s*phrase/i, /private\s*key/i, /send\s+\d+.*(?:get|receive)\s+\d+/i, /airdrop.*claim/i, /dm\s+me\s+for/i, /wallet\s*validat/i]

export const blacklistHook: ModerationHook = (ctx) => (ctx.blacklisted ? { verdict: 'reject', reason: 'Account is restricted' } : { verdict: 'allow' })

export const linkSpamHook: ModerationHook = (ctx) => {
  const links = countLinks(ctx.content)
  if (links > 2) return { verdict: 'reject', reason: 'Too many links' }
  if (links > 0) return { verdict: 'flag', reason: 'Contains links' }
  return { verdict: 'allow' }
}

export const scamPatternHook: ModerationHook = (ctx) =>
  SCAM_PATTERNS.some((p) => p.test(ctx.content)) ? { verdict: 'flag', reason: 'Possible scam or phishing language' } : { verdict: 'allow' }

export const repetitionHook: ModerationHook = (ctx) => {
  if (/(.)\1{9,}/u.test(ctx.content)) return { verdict: 'reject', reason: 'Repeated characters' }
  const letters = ctx.content.replace(/[^a-z]/gi, '')
  if (letters.length > 20 && letters === letters.toUpperCase()) return { verdict: 'flag', reason: 'Excessive capitals' }
  return { verdict: 'allow' }
}

export const duplicateHook: ModerationHook = (ctx) => {
  const normalized = ctx.content.toLowerCase().replace(/\s+/g, ' ')
  const dup = ctx.recentByAuthor.some((c) => ctx.now - c.createdAt < 10 * 60_000 && c.content.toLowerCase().replace(/\s+/g, ' ') === normalized)
  return dup ? { verdict: 'reject', reason: 'Duplicate comment' } : { verdict: 'allow' }
}

export const floodHook: ModerationHook = (ctx) => {
  const lastMinute = ctx.recentByAuthor.filter((c) => ctx.now - c.createdAt < 60_000).length
  return lastMinute >= 5 ? { verdict: 'reject', reason: 'You are commenting too quickly' } : { verdict: 'allow' }
}

export const DEFAULT_HOOKS: ModerationHook[] = [blacklistHook, floodHook, duplicateHook, repetitionHook, linkSpamHook, scamPatternHook]

const RANK: Record<Verdict, number> = { allow: 0, flag: 1, reject: 2 }

export function moderate(ctx: ModerationContext, hooks: ModerationHook[] = DEFAULT_HOOKS): ModerationResult {
  let verdict: Verdict = 'allow'
  const reasons: string[] = []
  for (const hook of hooks) {
    const r = hook(ctx)
    if (r.verdict !== 'allow' && r.reason) reasons.push(r.reason)
    if (RANK[r.verdict] > RANK[verdict]) verdict = r.verdict
  }
  return { verdict, reasons }
}
