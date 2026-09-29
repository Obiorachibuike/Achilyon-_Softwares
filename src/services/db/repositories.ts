import 'server-only'
import type { AppNotification, Comment, Report, ReportStatus, Role, UserProfile, WatchlistEntry } from '@/types'

/**
 * Repository layer. The default implementation is in-memory (process-local),
 * which is enough for demo mode and local development. For production,
 * implement these interfaces against Postgres — see docs/DATABASE.md for the
 * schema — and return them from `getRepositories()`.
 *
 * NOTE: on serverless platforms each instance has its own memory, so data in
 * the in-memory implementation is not durable or shared.
 */

export interface StoredComment extends Omit<Comment, 'likedByMe' | 'replyCount'> {
  likedBy: Set<string>
}

export interface CommentRepository {
  list(tokenKey: string): StoredComment[]
  get(id: string): StoredComment | undefined
  create(c: StoredComment): void
  recentByAuthor(author: string, sinceMs: number): StoredComment[]
  countFor(tokenKey: string): number
  byAuthor(author: string): StoredComment[]
  setStatus(id: string, status: Comment['status']): boolean
  toggleLike(id: string, address: string): { likes: number; liked: boolean } | null
}

export interface WatchlistRepository {
  list(address: string): WatchlistEntry[]
  add(address: string, entry: WatchlistEntry): void
  remove(address: string, key: string): void
  watcherCount(key: string): number
}

export interface ReportRepository {
  create(r: Report): void
  list(status?: ReportStatus): Report[]
  setStatus(id: string, status: ReportStatus): boolean
  countOpenFor(targetId: string): number
}

export interface UserRepository {
  touch(address: string, role: Role): UserProfile
  get(address: string): UserProfile | undefined
  addReputation(address: string, delta: number): void
  incrementCreated(address: string): void
}

export interface ModerationRepository {
  isBlacklisted(address: string): boolean
  setBlacklisted(address: string, value: boolean): void
  blacklist(): string[]
  isVerified(key: string): boolean | undefined
  setVerified(key: string, value: boolean): void
  featured(): string[]
  setFeatured(key: string, value: boolean): void
  isHidden(key: string): boolean
  flagged(): { address: string; reasons: string[]; at: number }[]
  flagAccount(address: string, reason: string): void
}

export interface NotificationRepository {
  list(address: string): AppNotification[]
  push(address: string, n: AppNotification): void
  markAllRead(address: string): void
}

export interface Repositories {
  comments: CommentRepository
  watchlists: WatchlistRepository
  reports: ReportRepository
  users: UserRepository
  moderation: ModerationRepository
  notifications: NotificationRepository
}

const lc = (s: string) => s.toLowerCase()

function createMemoryRepositories(): Repositories {
  const comments = new Map<string, StoredComment>()
  const watchlists = new Map<string, Map<string, WatchlistEntry>>()
  const reports = new Map<string, Report>()
  const users = new Map<string, UserProfile>()
  const blacklist = new Set<string>()
  const verified = new Map<string, boolean>()
  const featured = new Set<string>()
  const hidden = new Set<string>()
  const flaggedAccounts = new Map<string, { address: string; reasons: string[]; at: number }>()
  const notifications = new Map<string, AppNotification[]>()

  return {
    comments: {
      list: (key) => [...comments.values()].filter((c) => c.tokenKey === key),
      get: (id) => comments.get(id),
      create: (c) => { comments.set(c.id, c) },
      recentByAuthor: (author, since) => [...comments.values()].filter((c) => lc(c.author) === lc(author) && c.createdAt >= since),
      countFor: (key) => [...comments.values()].filter((c) => c.tokenKey === key && c.status === 'visible').length,
      byAuthor: (author) => [...comments.values()].filter((c) => lc(c.author) === lc(author)),
      setStatus: (id, status) => {
        const c = comments.get(id)
        if (!c) return false
        c.status = status
        return true
      },
      toggleLike: (id, address) => {
        const c = comments.get(id)
        if (!c) return null
        const a = lc(address)
        if (c.likedBy.has(a)) c.likedBy.delete(a)
        else c.likedBy.add(a)
        c.likes = c.likedBy.size
        return { likes: c.likes, liked: c.likedBy.has(a) }
      },
    },
    watchlists: {
      list: (address) => [...(watchlists.get(lc(address))?.values() ?? [])].sort((a, b) => b.addedAt - a.addedAt),
      add: (address, entry) => {
        const m = watchlists.get(lc(address)) ?? new Map<string, WatchlistEntry>()
        m.set(`${entry.chain}:${lc(entry.address)}`, entry)
        watchlists.set(lc(address), m)
      },
      remove: (address, key) => { watchlists.get(lc(address))?.delete(lc(key)) },
      watcherCount: (key) => [...watchlists.values()].filter((m) => m.has(lc(key))).length,
    },
    reports: {
      create: (r) => { reports.set(r.id, r) },
      list: (status) => [...reports.values()].filter((r) => !status || r.status === status).sort((a, b) => b.createdAt - a.createdAt),
      setStatus: (id, status) => {
        const r = reports.get(id)
        if (!r) return false
        r.status = status
        return true
      },
      countOpenFor: (targetId) => [...reports.values()].filter((r) => r.targetId === targetId && r.status === 'open').length,
    },
    users: {
      touch: (address, role) => {
        const existing = users.get(lc(address))
        if (existing) {
          existing.role = role
          return existing
        }
        const u: UserProfile = { address, joinedAt: Date.now(), reputation: 0, createdTokens: 0, comments: 0, role }
        users.set(lc(address), u)
        return u
      },
      get: (address) => users.get(lc(address)),
      addReputation: (address, delta) => {
        const u = users.get(lc(address))
        if (u) u.reputation = Math.max(0, u.reputation + delta)
      },
      incrementCreated: (address) => {
        const u = users.get(lc(address))
        if (u) u.createdTokens += 1
      },
    },
    moderation: {
      isBlacklisted: (a) => blacklist.has(lc(a)),
      setBlacklisted: (a, v) => { if (v) blacklist.add(lc(a)); else blacklist.delete(lc(a)) },
      blacklist: () => [...blacklist],
      isVerified: (key) => verified.get(lc(key)),
      setVerified: (key, v) => { verified.set(lc(key), v) },
      featured: () => [...featured],
      setFeatured: (key, v) => { if (v) featured.add(lc(key)); else featured.delete(lc(key)) },
      isHidden: (key) => hidden.has(lc(key)),
      flagged: () => [...flaggedAccounts.values()].sort((a, b) => b.at - a.at),
      flagAccount: (address, reason) => {
        const cur = flaggedAccounts.get(lc(address)) ?? { address, reasons: [], at: Date.now() }
        if (!cur.reasons.includes(reason)) cur.reasons.push(reason)
        cur.at = Date.now()
        flaggedAccounts.set(lc(address), cur)
      },
    },
    notifications: {
      list: (address) => notifications.get(lc(address)) ?? [],
      push: (address, n) => {
        const list = notifications.get(lc(address)) ?? []
        list.unshift(n)
        notifications.set(lc(address), list.slice(0, 50))
      },
      markAllRead: (address) => { (notifications.get(lc(address)) ?? []).forEach((n) => { n.read = true }) },
    },
  }
}

const g = globalThis as unknown as { __achilyonRepos?: Repositories }

export function getRepositories(): Repositories {
  if (!g.__achilyonRepos) g.__achilyonRepos = createMemoryRepositories()
  return g.__achilyonRepos
}
