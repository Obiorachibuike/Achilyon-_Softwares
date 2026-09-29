import { listHandler } from '../listHandler'

/** GET /api/tokens/new — alias for /api/tokens?list=new */
export const GET = listHandler('new')
