import type { MetadataRoute } from 'next'
import { publicConfig } from '@/lib/config'
import { listTokens } from '@/lib/blockchain/tokens'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicConfig.appUrl
  const now = new Date()
  const staticPages = ['', '/discover', '/trending', '/new', '/pairs', '/gainers', '/losers', '/launch', '/docs', '/analyzer', '/community'].map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: 'hourly' as const,
    priority: p === '' ? 1 : 0.7,
  }))
  let tokens: MetadataRoute.Sitemap = []
  // Demo tokens are regenerated per deployment, so only live tokens belong in the sitemap.
  if (!publicConfig.demoMode) {
    try {
      tokens = (await listTokens())
        .filter((t) => t.source === 'live')
        .slice(0, 500)
        .map((t) => ({ url: `${base}/token/${t.token.chain}/${t.token.address}`, lastModified: now, changeFrequency: 'hourly' as const, priority: 0.5 }))
    } catch {
      tokens = []
    }
  }
  return [...staticPages, ...tokens]
}
