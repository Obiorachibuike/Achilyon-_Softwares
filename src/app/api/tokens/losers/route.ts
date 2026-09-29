import { listHandler } from '../listHandler'

/** GET /api/tokens/losers — alias for /api/tokens?list=losers */
export const GET = listHandler('losers')
