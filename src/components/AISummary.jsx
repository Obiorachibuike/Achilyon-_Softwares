
import { Brain, TrendingUp, ShieldAlert, Zap } from 'lucide-react'
import PropTypes from 'prop-types'

const AISummary = ({ token }) => {
  if (!token) return (
    <div className="bg-muted/50 border border-border p-4 rounded-xl text-center text-muted-foreground text-sm italic">
      Select a token to generate AI analysis...
    </div>
  )

  const getAnalysis = () => {
    const vol = parseFloat(token.volume?.h24 || 0)
    const liq = parseFloat(token.liquidity?.usd || 0)
    const txns = token.txns?.h24 || { buys: 0, sells: 0 }
    const buyRatio = txns.buys / (txns.buys + txns.sells || 1)

    if (vol > 5000000 && buyRatio > 0.6) {
      return {
        text: `High-conviction bullish signal. Massive volume ($${(vol/1000000).toFixed(1)}M) combined with strong buy pressure (${(buyRatio*100).toFixed(0)}%). Institutional-grade liquidity support.`,
        icon: TrendingUp,
        color: 'text-green-500'
      }
    }

    if (liq < 20000) {
      return {
        text: `Extreme volatility warning. Critical liquidity depth ($${(liq/1000).toFixed(1)}K). Small trades may cause significant price impact. High rug-risk profile.`,
        icon: ShieldAlert,
        color: 'text-red-500'
      }
    }

    if (txns.buys + txns.sells > 5000 && vol > 1000000) {
      return {
        text: `High retail activity detected. Rapid transaction throughput indicates active community engagement and potential breakout momentum.`,
        icon: Zap,
        color: 'text-yellow-500'
      }
    }

    return {
      text: `Neutral market consolidation. Trading metrics for ${token.baseToken?.symbol} are currently within historical norms with balanced buy/sell activity.`,
      icon: Brain,
      color: 'text-primary'
    }
  }

  const analysis = getAnalysis()
  const Icon = analysis.icon

  return (
    <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl space-y-3 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <Brain size={18} />
          <span className="text-xs font-bold uppercase tracking-widest">AI Intelligence Layer</span>
        </div>
        <div className={analysis.color}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-sm leading-relaxed font-medium">
        {analysis.text}
      </p>
      <div className="pt-2 flex gap-2">
        <span className="text-[10px] bg-secondary px-2 py-0.5 rounded text-muted-foreground font-bold uppercase">Real-Time</span>
        <span className="text-[10px] bg-secondary px-2 py-0.5 rounded text-muted-foreground font-bold uppercase">On-Chain Data</span>
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
