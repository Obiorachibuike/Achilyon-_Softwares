import 'server-only'
import { randomBytes } from 'node:crypto'
import type { Comment, MarketToken } from '@/types'
import { tokenKey } from '@/lib/blockchain/chains'
import { moderate } from '@/lib/security/moderation'
import { sanitizeText } from '@/lib/security/sanitize'
import { COMMENT_POOL } from '@/data/mock/catalog'
import { intBetween, pick, randomAddress, rngFor } from '@/data/mock/generate'
import { getRepositories, type StoredComment } from '@/services/db/repositories'
import { ApiError } from '@/lib/api/http'

export const newId = () => randomBytes(8).toString('hex')

const seeded = new Set<string>()

/** Seeds deterministic demo chatter for a demo token the first time it's needed. */
export function ensureDemoComments(t: MarketToken) {
  if (t.source !== 'demo') return
  const key = tokenKey(t.token.chain, t.token.address)
  if (seeded.has(key)) return
  seeded.add(key)
  const repo = getRepositories()
  const rng = rngFor(`comments:${key}`)
  const count = intBetween(rng, 2, 14)
  const span = Math.max(60_000, Date.now() - t.token.createdAt)
  const ids: string[] = []
  for (let i = 0; i < count; i++) {
    const id = `seed${key.replace(/[^a-z0-9]/gi, '').slice(-10)}${i}`.toLowerCase()
    const parentId = ids.length && rng() < 0.25 ? pick(rng, ids) : null
    const likedBy = new Set<string>()
    const likes = intBetween(rng, 0, 40)
    for (let l = 0; l < likes; l++) likedBy.add(`seed-${l}`)
    repo.comments.create({
      id, tokenKey: key, parentId, author: randomAddress(rng, t.token.chain), content: pick(rng, COMMENT_POOL),
      createdAt: Date.now() - Math.round(rng() * span), likes, likedBy, status: 'visible',
    })
    ids.push(id)
  }
}

export function toPublicComment(c: StoredComment, viewer: string | null, all: StoredComment[]): Comment {
  return {
    id: c.id,
    tokenKey: c.tokenKey,
    parentId: c.parentId,
    author: c.author,
    content: c.content,
    createdAt: c.createdAt,
    likes: c.likes,
    likedByMe: viewer ? c.likedBy.has(viewer.toLowerCase()) : false,
    replyCount: all.filter((x) => x.parentId === c.id && x.status === 'visible').length,
    status: c.status,
  }
}

export function listComments(key: string, viewer: string | null, sort: 'new' | 'top' | 'old'): Comment[] {
  const all = getRepositories().comments.list(key)
  const visible = all.filter((c) => c.status === 'visible' || (viewer && c.author.toLowerCase() === viewer.toLowerCase()))
  const sorted = [...visible].sort((a, b) => (sort === 'top' ? b.likes - a.likes || b.createdAt - a.createdAt : sort === 'old' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt))
  return sorted.map((c) => toPublicComment(c, viewer, all))
}

export function createComment(input: { key: string; author: string; content: string; parentId: string | null }): Comment {
  const repo = getRepositories()
  const content = sanitizeText(input.content, 500)
  if (content.length < 1) throw new ApiError(400, 'EMPTY', 'Write something first')
  if (input.parentId) {
    const parent = repo.comments.get(input.parentId)
    if (!parent || parent.tokenKey !== input.key) throw new ApiError(404, 'NOT_FOUND', 'The comment you are replying to no longer exists')
  }
  const now = Date.now()
  const result = moderate({
    author: input.author,
    content,
    recentByAuthor: repo.comments.recentByAuthor(input.author, now - 10 * 60_000),
    blacklisted: repo.moderation.isBlacklisted(input.author),
    now,
  })
  if (result.verdict === 'reject') throw new ApiError(422, 'MODERATION_REJECTED', result.reasons[0] ?? 'Comment rejected')
  const stored: StoredComment = {
    id: newId(), tokenKey: input.key, parentId: input.parentId, author: input.author, content,
    createdAt: now, likes: 0, likedBy: new Set(), status: result.verdict === 'flag' ? 'flagged' : 'visible',
  }
  repo.comments.create(stored)
  if (result.verdict === 'flag') repo.moderation.flagAccount(input.author, result.reasons.join(', '))
  else repo.users.addReputation(input.author, 1)
  return toPublicComment(stored, input.author, repo.comments.list(input.key))
}
