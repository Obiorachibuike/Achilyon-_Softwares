import type { NextRequest } from 'next/server'
import { guard, ok, parseBody, route } from '@/lib/api/http'
import { moderationActionSchema } from '@/lib/api/schemas'
import { getRepositories } from '@/services/db/repositories'
import { getEngine } from '@/services/demo/engine'

/** GET /api/admin/moderation — moderation queue (admin only). */
export const GET = route(async (req: NextRequest) => {
  await guard(req, { auth: 'admin' })
  const repo = getRepositories()
  const flaggedComments = getEngine().list().flatMap((t) => repo.comments.list(`${t.token.chain}:${t.token.address.toLowerCase()}`)).filter((c) => c.status === 'flagged')
  return ok({
    reports: repo.reports.list(),
    flaggedAccounts: repo.moderation.flagged(),
    flaggedComments: flaggedComments.map(({ likedBy: _likedBy, ...c }) => c),
    blacklist: repo.moderation.blacklist(),
    featured: repo.moderation.featured(),
  })
})

/** POST /api/admin/moderation { action, targetId, reportId? } */
export const POST = route(async (req: NextRequest) => {
  await guard(req, { auth: 'admin' })
  const { action, targetId, reportId } = await parseBody(req, moderationActionSchema)
  const repo = getRepositories()
  switch (action) {
    case 'resolve': repo.reports.setStatus(targetId, 'resolved'); break
    case 'dismiss': repo.reports.setStatus(targetId, 'dismissed'); break
    case 'hide_comment': repo.comments.setStatus(targetId, 'hidden'); break
    case 'verify_token': repo.moderation.setVerified(targetId, true); break
    case 'unverify_token': repo.moderation.setVerified(targetId, false); break
    case 'feature_token': repo.moderation.setFeatured(targetId, true); break
    case 'unfeature_token': repo.moderation.setFeatured(targetId, false); break
    case 'blacklist': repo.moderation.setBlacklisted(targetId, true); break
    case 'unblacklist': repo.moderation.setBlacklisted(targetId, false); break
  }
  if (reportId) repo.reports.setStatus(reportId, 'resolved')
  return ok({ done: true })
})
