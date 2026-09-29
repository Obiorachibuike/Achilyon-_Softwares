import type { NextRequest } from 'next/server'
import { verifyMessage, getAddress } from 'viem'
import { ApiError, guard, ok, parseBody, route } from '@/lib/api/http'
import { authVerifySchema } from '@/lib/api/schemas'
import { consumeNonce, createSession } from '@/services/auth/session'
import { getRepositories } from '@/services/db/repositories'

/**
 * POST /api/auth/verify { address, message, signature }
 * Verifies an EIP-191 signature over the sign-in message. The message must
 * contain the nonce issued to this browser and this site's host.
 */
export const POST = route(async (req: NextRequest) => {
  await guard(req, { rate: 'auth' })
  const body = await parseBody(req, authVerifySchema)
  const nonce = await consumeNonce()
  if (!nonce || !body.message.includes(`Nonce: ${nonce}`)) throw new ApiError(401, 'INVALID_NONCE', 'Sign-in request expired — please try again')
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? ''
  if (!body.message.startsWith(`${host} wants you to sign in`)) throw new ApiError(401, 'INVALID_DOMAIN', 'Sign-in message was issued for a different site')
  if (!/^0x[a-fA-F0-9]{40}$/.test(body.address)) throw new ApiError(400, 'UNSUPPORTED', 'Only EVM wallets can sign in at the moment')
  const address = getAddress(body.address)
  const valid = await verifyMessage({ address, message: body.message, signature: body.signature as `0x${string}` })
  if (!valid) throw new ApiError(401, 'INVALID_SIGNATURE', 'Signature could not be verified')
  if (getRepositories().moderation.isBlacklisted(address)) throw new ApiError(403, 'RESTRICTED', 'This address is restricted')
  const session = await createSession(address, false)
  getRepositories().users.touch(address, session.role)
  return ok(session)
})
