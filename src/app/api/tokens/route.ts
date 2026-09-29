import { listHandler } from './listHandler'

/** GET /api/tokens?list=all|trending|new|pairs|gainers|losers&chain=&sort=&dir=&page=&pageSize=&…filters */
export const GET = listHandler()
