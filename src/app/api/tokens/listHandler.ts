import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { guard, ok, route } from '@/lib/api/http'
import { MARKET_LISTS, SORT_KEYS, selectList, type MarketList } from '@/lib/api/lists'
import { filtersFromParams } from '@/lib/market/filters'
import { paginate } from '@/lib/market/sorting'
import { isChainId } from '@/lib/blockchain/chains'
import { listTokens } from '@/lib/blockchain/tokens'
import { publicConfig } from '@/lib/config'

const querySchema = z.object({
  list: z.enum(MARKET_LISTS as [MarketList, ...MarketList[]]).default('all'),
  page: z.coerce.number().int().min(1).max(500).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  sort: z.enum(SORT_KEYS as [string, ...string[]]).optional(),
  dir: z.enum(['asc', 'desc']).default('desc'),
})

export function listHandler(fixed?: MarketList) {
  return route(async (req: NextRequest) => {
    await guard(req)
    const params = new URL(req.url).searchParams
    const q = querySchema.parse({ ...Object.fromEntries(params), ...(fixed ? { list: fixed } : {}) })
    const filters = filtersFromParams(params, isChainId)
    const sort = q.sort ? { key: q.sort as (typeof SORT_KEYS)[number], dir: q.dir } : undefined
    const tokens = selectList(await listTokens(), q.list, filters, sort)
    const page = paginate(tokens, q.page, q.pageSize)
    return ok(
      { items: page.items, total: page.total, page: page.page, pageSize: q.pageSize },
      { meta: { list: q.list, pages: page.pages, demo: publicConfig.demoMode, generatedAt: Date.now() }, cache: 'public, s-maxage=5, stale-while-revalidate=30' },
    )
  })
}
