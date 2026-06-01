
import { Brain } from 'lucide-react'
import PropTypes from 'prop-types'

const AISummary = ({ token }) => {
  if (!token) return null

  // Mock AI summary logic based on token data
  const getSummary = () => {
    const vol = parseFloat(token.volume?.h24 || 0)
    const liq = parseFloat(token.liquidity?.usd || 0)
    const buys = parseInt(token.txns?.h24?.buys || 0)
    const sells = parseInt(token.txns?.h24?.sells || 0)

    if (vol > 1000000 && buys > sells * 1.5) {
      return `Strong bullish momentum for ${token.baseToken?.symbol}. High volume ($${(vol/1000000).toFixed(1)}M) with significant buying pressure. Whale accumulation detected on ${token.chainId}.`
    }
    if (liq < 50000) {
      return `High risk for ${token.baseToken?.symbol}. Low liquidity ($${(liq/1000).toFixed(1)}K) may lead to high slippage. Exercise caution while trading on ${token.dexId}.`
    }
    return `Stable trading activity. Liquidity and volume are within normal ranges for ${token.baseToken?.symbol}.`
  }

  return (
    <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl space-y-2">
      <div className="flex items-center gap-2 text-primary">
        <Brain size={18} />
        <span className="text-sm font-bold uppercase tracking-wider">AI Analysis</span>
      </div>
      <p className="text-sm leading-relaxed">
        {getSummary()}
      </p>
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
    }),
    chainId: PropTypes.string,
    dexId: PropTypes.string
  })
}

export default AISummary
