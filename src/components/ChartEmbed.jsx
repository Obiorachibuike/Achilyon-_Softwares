import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { dexScreenerEmbedUrl } from '../lib/market'
import useThemeStore from '../store/useThemeStore'
import { cn } from '../lib/utils'

export default function ChartEmbed({ chainId, pairAddress, className }) {
  const theme = useThemeStore((s) => s.theme)
  const [loaded, setLoaded] = useState(false)
  if (!chainId || !pairAddress) return null
  return (
    <div className={cn('relative h-[420px] overflow-hidden rounded-2xl border border-border bg-card', className)}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-muted/40" />}
      <iframe
        key={`${chainId}-${pairAddress}-${theme}`}
        title="Price chart"
        src={dexScreenerEmbedUrl(chainId, pairAddress, theme === 'light' ? 'light' : 'dark')}
        className="h-full w-full"
        onLoad={() => setLoaded(true)}
        loading="lazy"
      />
      <a href={`https://dexscreener.com/${chainId}/${pairAddress}`} target="_blank" rel="noreferrer" className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur hover:text-foreground">
        DexScreener <ExternalLink size={11} />
      </a>
    </div>
  )
}
