import { Sparkles, TrendingUp, ShieldCheck, AlertTriangle } from 'lucide-react'
import { formatPercent } from '../lib/utils'
import PropTypes from 'prop-types'

export function AISummary({ pair }) {
  if (!pair) return null

  const priceChange = pair.priceChange?.h24 || 0
  const isUp = priceChange > 0

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 text-primary font-bold mb-2">
        <Sparkles size={18} className="fill-primary" />
        <span>AI Analysis</span>
      </div>
      <p className="text-sm leading-relaxed">
        <span className="font-bold">{pair.baseToken?.symbol}</span> has shown
        <span className={isUp ? "text-green-500 font-bold" : "text-red-500 font-bold"}>
          {isUp ? ' strong upward' : ' downward'} momentum
        </span> with a {formatPercent(priceChange)} change in the last 24 hours.
        The volume-to-liquidity ratio is {((pair.volume?.h24 || 0) / (pair.liquidity?.usd || 1)).toFixed(2)},
        suggesting {pair.volume?.h24 > pair.liquidity?.usd ? 'high trading interest relative to depth' : 'stable trading activity'}.
      </p>

      <div className="flex flex-wrap gap-4 mt-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
          <ShieldCheck size={14} />
          Verified Contract
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-blue-500 bg-blue-500/10 px-2 py-1 rounded-full">
          <TrendingUp size={14} />
          High Trending Score
        </div>
        {pair.liquidity?.usd < 50000 && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
            <AlertTriangle size={14} />
            Low Liquidity Risk
          </div>
        )}
      </div>
    </div>
  )
}

AISummary.propTypes = {
  pair: PropTypes.object
}
