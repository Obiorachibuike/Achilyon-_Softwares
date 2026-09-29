import type { NextRequest } from 'next/server'
import { ApiError, guard, ok, route } from '@/lib/api/http'
import { getRepositories } from '@/services/db/repositories'

type Ctx = { params: Promise<{ id: string }> }

/** POST /api/comments/:id/like — toggles a like for the signed-in wallet. */
export const POST = route<Ctx>(async (req: NextRequest, { params }) => {
  const session = await guard(req, { auth: 'user' })
  const { id } = await params
  if (!/^[a-z0-9]{6,40}$/.test(id)) throw new ApiError(400, 'INVALID_ID', 'Invalid comment id')
  const result = getRepositories().comments.toggleLike(id, session.address)
  if (!result) throw new ApiError(404, 'NOT_FOUND', 'Comment not found')
  return ok(result)
})
