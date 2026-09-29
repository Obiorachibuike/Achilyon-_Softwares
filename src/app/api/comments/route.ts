import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { ApiError, guard, ok, parseBody, parseQuery, route } from '@/lib/api/http'
import { commentCreateSchema, tokenRefSchema } from '@/lib/api/schemas'
import { tokenKey } from '@/lib/blockchain/chains'
import { getToken } from '@/lib/blockchain/tokens'
import { createComment, listComments } from '@/services/community'

/** GET /api/comments?chain=&address=&sort=new|top|old */
export const GET = route(async (req: NextRequest) => {
  const session = await guard(req)
  const q = parseQuery(req, tokenRefSchema.extend({ sort: z.enum(['new', 'top', 'old']).default('new') }))
  const token = await getToken(q.chain, q.address) // also seeds demo comments
  if (!token) throw new ApiError(404, 'TOKEN_NOT_FOUND', 'Token not found')
  return ok(listComments(tokenKey(q.chain, q.address), session?.address ?? null, q.sort))
})

/** POST /api/comments { chain, address, content, parentId? } — requires a signed-in wallet. */
export const POST = route(async (req: NextRequest) => {
  const session = await guard(req, { auth: 'user', rate: 'write' })
  const body = await parseBody(req, commentCreateSchema)
  const token = await getToken(body.chain, body.address)
  if (!token) throw new ApiError(404, 'TOKEN_NOT_FOUND', 'Token not found')
  const comment = createComment({ key: tokenKey(body.chain, body.address), author: session.address, content: body.content, parentId: body.parentId ?? null })
  return ok(comment, { status: 201, meta: comment.status === 'flagged' ? { notice: 'Your comment is pending review by moderators.' } : undefined })
})
