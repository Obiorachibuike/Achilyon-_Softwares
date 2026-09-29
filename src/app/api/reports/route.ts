import type { NextRequest } from 'next/server'
import { guard, ok, parseBody, route } from '@/lib/api/http'
import { reportCreateSchema } from '@/lib/api/schemas'
import { sanitizeText } from '@/lib/security/sanitize'
import { getRepositories } from '@/services/db/repositories'
import { newId } from '@/services/community'

/** POST /api/reports { targetType, targetId, reason, details } */
export const POST = route(async (req: NextRequest) => {
  const session = await guard(req, { auth: 'user', rate: 'write' })
  const body = await parseBody(req, reportCreateSchema)
  const repo = getRepositories()
  const duplicate = repo.reports.list('open').some((r) => r.targetId === body.targetId && r.reporter.toLowerCase() === session.address.toLowerCase())
  if (!duplicate) {
    repo.reports.create({ id: newId(), ...body, details: sanitizeText(body.details, 500), reporter: session.address, createdAt: Date.now(), status: 'open' })
    // Auto-hide comments that accumulate several independent reports pending review.
    if (body.targetType === 'comment' && repo.reports.countOpenFor(body.targetId) >= 3) repo.comments.setStatus(body.targetId, 'flagged')
  }
  return ok({ received: true }, { status: 201 })
})
