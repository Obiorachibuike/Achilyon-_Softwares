import { Sparkles } from 'lucide-react'
import PropTypes from 'prop-types'
import { calculateTrendScore } from '../lib/trending'

const AISummary = ({ pair }) => {
  if (!pair) return null

  const score = calculateTrendScore(pair)

  const generateSummary = () => {
    const symbol = pair.baseToken?.symbol || 'Token'
    const priceChange = pair.priceChange?.h24 || 0
    const volume = pair.volume?.h24 || 0

    let sentiment = 'Neutral'
    if (score > 70) sentiment = 'Extremely Bullish'
    else if (score > 40) sentiment = 'Bullish'
    else if (priceChange < -20) sentiment = 'Bearish'

    const accumulation = pair.txns?.h1?.buys > pair.txns?.h1?.sells * 1.5 ? 'strong whale accumulation' : 'steady trading activity'

    return `${symbol} shows ${sentiment.toLowerCase()} behavior with a trend score of ${score}/100. The pair has seen ${accumulation} and a 24h volume of $${(volume / 1000).toFixed(1)}k. AI analysis suggests ${score > 60 ? 'potential for further upside' : 'watching for support levels'}.`
  }

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex gap-4 items-start">
      <div className="bg-primary/10 p-2 rounded-lg text-primary">
        <Sparkles size={20} />
      </div>
      <div className="space-y-1">
        <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
          AI Intelligence Summary
          <span className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-[8px]">BETA</span>
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed italic">
          &quot;{generateSummary()}&quot;
        </p>
      </div>
    </div>
  )
}

AISummary.propTypes = {
  pair: PropTypes.object
}

export default AISummary
