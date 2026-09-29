import { listHandler } from '../listHandler'

/** GET /api/tokens/trending — alias for /api/tokens?list=trending */
export const GET = listHandler('trending')
