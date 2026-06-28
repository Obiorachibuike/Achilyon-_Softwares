
import { Brain, TrendingUp, AlertTriangle } from 'lucide-react'
import PropTypes from 'prop-types'

const AISummary = ({ token }) => {
  if (!token) return (
    <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex items-center justify-center h-[120px]">
       <p className="text-xs text-muted-foreground italic">Gathering market data for analysis...</p>
    </div>
  )

  // Mock AI summary logic based on token data
  const getAnalysis = () => {
    const vol = parseFloat(token.volume?.h24 || 0)
    const liq = parseFloat(token.liquidity?.usd || 0)
    const buys = parseInt(token.txns?.h24?.buys || 0)
    const sells = parseInt(token.txns?.h24?.sells || 0)
    const total = buys + sells
    const buyRatio = total > 0 ? (buys / total) : 0

    if (vol > 1000000 && buyRatio > 0.6) {
      return {
        text: `Strong bullish momentum. High volume ($${(vol/1000000).toFixed(1)}M) with dominant buying pressure. Heavy whale accumulation detected over the last 24h.`,
        type: 'bullish'
      }
    }

    if (liq < 50000) {
      return {
        text: `Extreme volatility risk. Low liquidity ($${(liq/1000).toFixed(1)}K) detected. Price impact for small trades may exceed 5%. Manual contract audit recommended.`,
        type: 'risk'
      }
    }

    if (buyRatio < 0.4 && vol > 500000) {
      return {
        text: `Distribution phase detected. Significant sell volume is being absorbed. Potential for short-term correction before next leg up.`,
        type: 'neutral'
      }
    }

    return {
      text: `Stable trading activity. Liquidity and volume are within established ranges for ${token.baseToken?.symbol}. Holder base remains consistent.`,
      type: 'stable'
    }
  }

  const analysis = getAnalysis()

  return (
    <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <Brain size={18} />
          <span className="text-[10px] font-bold uppercase tracking-widest">AI Intelligence Layer</span>
        </div>
        {analysis.type === 'bullish' && <TrendingUp size={14} className="text-green-500" />}
        {analysis.type === 'risk' && <AlertTriangle size={14} className="text-red-500 animate-pulse" />}
      </div>
      <p className="text-xs leading-relaxed text-foreground/90 font-medium">
        {analysis.text}
      </p>
      <div className="flex items-center gap-2 pt-1">
        <div className="px-2 py-0.5 rounded-full bg-primary/10 text-[9px] font-bold text-primary uppercase">Alpha Alert</div>
        <div className="px-2 py-0.5 rounded-full bg-secondary text-[9px] font-bold text-muted-foreground uppercase">Real-time</div>
      </div>
    </div>
  )
}

AISummary.propTypes = {
  token: PropTypes.shape({
    volume: PropTypes.shape({
      h24: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    }),
    liquidity: PropTypes.shape({
      usd: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    }),
    txns: PropTypes.shape({
      h24: PropTypes.shape({
        buys: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        sells: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
      })
    }),
    baseToken: PropTypes.shape({
      symbol: PropTypes.string
    })
  })
}

export default AISummary
