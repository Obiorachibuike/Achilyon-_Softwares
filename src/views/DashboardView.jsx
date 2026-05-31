
import { TrendingUp, Activity, ShieldCheck, Zap } from 'lucide-react'
import CoinsTable from '../components/CoinsTable'
import useCoinStore from '../store/useCoinStore'
import { cn } from '../lib/utils'
import PropTypes from 'prop-types'
import { useMemo } from 'react'

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-card p-6 rounded-xl border border-border flex items-center justify-between">
    <div>
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
    <div className={cn("p-3 rounded-lg bg-secondary", color)}>
      <Icon size={24} />
    </div>
  </div>
)

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  color: PropTypes.string.isRequired,
}

const DashboardView = ({ fetchData }) => {
  const { coins } = useCoinStore()

  const stats = useMemo(() => {
    const totalPairs = coins.length
    const newListings = coins.filter(p => (Date.now() - p.pairCreatedAt) / (1000 * 60 * 60) < 24).length
    const safePairs = coins.filter(p => p.info?.imageUrl || p.info?.socials?.length > 0).length
    const safePercentage = totalPairs > 0 ? Math.round((safePairs / totalPairs) * 100) : 0

    return {
      trending: totalPairs.toLocaleString(),
      new: newListings.toString(),
      safe: `${safePercentage}%`,
      volatility: totalPairs > 50 ? 'High' : 'Normal'
    }
  }, [coins])

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Tracked Pairs" value={stats.trending} icon={TrendingUp} color="text-blue-500" />
        <StatCard title="New (24h)" value={stats.new} icon={Zap} color="text-yellow-500" />
        <StatCard title="Verified" value={stats.safe} icon={ShieldCheck} color="text-green-500" />
        <StatCard title="Volatility" value={stats.volatility} icon={Activity} color="text-red-500" />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-bold">Top Market Pairs</h2>
          <button className="text-sm text-primary hover:underline" onClick={fetchData}>Refresh</button>
        </div>
        <CoinsTable data={coins.slice(0, 10)} />
      </div>
    </div>
  )
}

DashboardView.propTypes = {
  fetchData: PropTypes.func.isRequired,
}

export default DashboardView
