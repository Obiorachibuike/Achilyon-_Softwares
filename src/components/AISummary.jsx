import { Brain } from 'lucide-react'
import PropTypes from 'prop-types'
import { summarize } from '../lib/signals'

const AISummary = ({ token }) => {
  if (!token) return null
  return (
    <div className="space-y-2 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2 text-primary">
        <Brain size={17} />
        <span className="text-xs font-bold uppercase tracking-wider">Signal summary</span>
        <span className="ml-auto text-[10px] text-muted-foreground">heuristic</span>
      </div>
      <ul className="space-y-1.5 text-sm leading-relaxed">
        {summarize(token).map((n) => <li key={n}>{n}</li>)}
      </ul>
    </div>
  )
}

AISummary.propTypes = {
  token: PropTypes.shape({
    volume: PropTypes.shape({ h24: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) }),
    liquidity: PropTypes.shape({ usd: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) }),
    txns: PropTypes.shape({ h24: PropTypes.shape({ buys: PropTypes.number, sells: PropTypes.number }) }),
    priceChange: PropTypes.shape({ h24: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) }),
    baseToken: PropTypes.shape({ symbol: PropTypes.string }),
  }),
}

export default AISummary
