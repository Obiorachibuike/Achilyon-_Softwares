import type { MetadataRoute } from 'next'
import { publicConfig } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/admin', '/portfolio', '/transactions', '/settings'] }],
    sitemap: `${publicConfig.appUrl}/sitemap.xml`,
    host: publicConfig.appUrl,
  }
}
