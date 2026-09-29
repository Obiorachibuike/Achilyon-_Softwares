import { listHandler } from '../listHandler'

/** GET /api/tokens/gainers — alias for /api/tokens?list=gainers */
export const GET = listHandler('gainers')
