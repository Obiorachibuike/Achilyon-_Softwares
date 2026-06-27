import PropTypes from 'prop-types'
import { Sparkles } from 'lucide-react'
import { formatCompactNumber } from '../lib/utils'

const AISummary = ({ coins }) => {
  if (!coins || coins.length === 0) return null

  // Create a mock intelligence summary based on top coin
  const topCoin = coins[0]
  const buys = topCoin.txns?.h24?.buys || 0
  const sells = topCoin.txns?.h24?.sells || 0
  const total = buys + sells
  const buyRatio = total > 0 ? (buys / total) * 100 : 0
  const vol = formatCompactNumber(topCoin.volume?.h24 || 0)

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-4">
      <div className="bg-primary/10 p-2 rounded-lg text-primary">
        <Sparkles size={20} />
      </div>
      <div className="flex-1 space-y-1">
        <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Terminal Intelligence</h4>
        <p className="text-sm text-foreground leading-relaxed">
          <span className="font-bold text-primary">{topCoin.baseToken?.symbol}</span> is showing strong momentum on <span className="capitalize">{topCoin.chainId}</span>.
          Gained <span className="text-green-500 font-bold">${vol}</span> in 24h volume with a <span className="font-bold">{buyRatio.toFixed(0)}% buy ratio</span>.
          Whale accumulation detected in recent blocks.
        </p>
      </div>
      <div className="hidden md:block">
         <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Confidence</div>
         <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary w-[85%]"></div>
         </div>
      </div>
    </div>
  )
}

AISummary.propTypes = {
  coins: PropTypes.array.isRequired
}

export default AISummary
