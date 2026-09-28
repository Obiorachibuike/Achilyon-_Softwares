import { Link } from 'react-router-dom'
import { cn } from '../lib/utils'

export default function Logo({ compact = false, className }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2.5', className)} aria-label="Achilyon home">
      <img src="/achilyon.svg" alt="" width={compact ? 28 : 34} height={compact ? 28 : 34} className="rounded-lg" />
      <div className="leading-none">
        <span className="brand block text-lg font-bold tracking-tight">ACHILYON</span>
        {!compact && <span className="mt-1 block text-[9px] uppercase tracking-[.24em] text-muted-foreground">On-chain terminal</span>}
      </div>
    </Link>
  )
}
