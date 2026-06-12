import { useEffect, useCallback, useMemo } from 'react'
import Sidebar from './components/Sidebar'
import FiltersBar from './components/FiltersBar'
import CoinsTable from './components/CoinsTable'
import useCoinStore from './store/useCoinStore'
import { coinService } from './services/api'
import { calculateTrendingScore } from './lib/trending'
import { TrendingUp, Activity, ShieldCheck, Zap } from 'lucide-react'
import { cn } from './lib/utils'
import PropTypes from 'prop-types'

const App = () => {
  const {
    view,
    coins,
    setCoins,
    loading,
    setLoading,
    setError,
    filters,
    address,
    connectWallet
  } = useCoinStore()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let data = []
      if (filters.searchQuery) {
        data = await coinService.searchPairs(filters.searchQuery)
      } else if (filters.network !== 'all') {
        data = await coinService.getPairsByChain(filters.network)
      } else {
        data = await coinService.getTrending()
      }

      // Client-side filtering
      let filteredData = data

      // Network filter (if search was global)
      if (filters.network !== 'all') {
        // Map bnb to bsc for DexScreener consistency
        const dsChain = filters.network === 'bnb' ? 'bsc' : filters.network
        filteredData = filteredData.filter(p => p.chainId === dsChain)
      }

      // DEX filter
      if (filters.dex !== 'all') {
        filteredData = filteredData.filter(p =>
          p.dexId?.toLowerCase().includes(filters.dex.toLowerCase())
        )
      }

      // Age filter
      if (filters.age !== 'all') {
        const hours = filters.age === '1h' ? 1 : filters.age === '6h' ? 6 : filters.age === '24h' ? 24 : 168
        const now = Date.now()
        filteredData = filteredData.filter(p => {
          if (!p.pairCreatedAt) return false
          return (now - p.pairCreatedAt) / (1000 * 60 * 60) <= hours
        })
      }

      // Liquidity filter
      if (filters.liquidity !== 'all') {
        const minLiq = filters.liquidity === '10k' ? 10000 : filters.liquidity === '100k' ? 100000 : 1000000
        filteredData = filteredData.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
      }

      // Volume filter
      if (filters.volume !== 'all') {
        const minVol = filters.volume === '50k' ? 50000 : filters.volume === '500k' ? 500000 : 5000000
        filteredData = filteredData.filter(p => parseFloat(p.volume?.h24 || 0) >= minVol)
      }

      // Market Cap filter
      if (filters.marketCap !== 'all') {
        filteredData = filteredData.filter(p => {
          const fdv = parseFloat(p.fdv || 0)
          if (filters.marketCap === 'micro') return fdv < 100000
          if (filters.marketCap === 'small') return fdv >= 100000 && fdv < 1000000
          if (filters.marketCap === 'mid') return fdv >= 1000000 && fdv < 10000000
          if (filters.marketCap === 'large') return fdv >= 10000000
          return true
        })
      }

      // Verified filter (simple heuristic: has websites or socials)
      if (filters.verified) {
        filteredData = filteredData.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0)
      }

      setCoins(filteredData)
    } catch (err) {
      setError('Failed to fetch data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filters, setCoins, setError, setLoading])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Derive stats for Dashboard
  const stats = useMemo(() => {
    const trendingCount = coins.filter(p => calculateTrendingScore(p) > 50).length
    const newCount = coins.filter(p => {
      if (!p.pairCreatedAt) return false
      return (Date.now() - p.pairCreatedAt) / (1000 * 60 * 60) <= 24
    }).length
    const verifiedPercent = coins.length > 0
      ? Math.round((coins.filter(p => p.info?.websites?.length > 0).length / coins.length) * 100)
      : 0

    return { trendingCount, newCount, verifiedPercent }
  }, [coins])

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Trending Pairs" value={stats.trendingCount.toString()} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New (24h)" value={stats.newCount.toString()} icon={Zap} color="text-yellow-500" />
              <StatCard title="Safe/Verified" value={`${stats.verifiedPercent}%`} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Market Volatility" value="High" icon={Activity} color="text-red-500" />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h2 className="text-lg font-bold">Top Market Pairs</h2>
                <button className="text-sm text-primary hover:underline" onClick={() => fetchData()}>Refresh</button>
              </div>
              <CoinsTable data={coins.slice(0, 10)} />
            </div>
          </div>
        )
      case 'coins':
        return (
          <div className="flex flex-col h-full">
            <FiltersBar />
            <div className="flex-1 overflow-auto bg-card">
              <CoinsTable data={coins} />
            </div>
          </div>
        )
      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground italic">
            {view.charAt(0).toUpperCase() + view.slice(1)} view is under development...
          </div>
        )
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center space-y-1">
             <h2 className="text-xl font-bold capitalize">{view}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              LIVE
            </div>
            {address ? (
              <div className="flex items-center gap-3 bg-secondary px-4 py-2 rounded-lg border border-border">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">{address}</span>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </main>
    </div>
  )
}

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

export default App
