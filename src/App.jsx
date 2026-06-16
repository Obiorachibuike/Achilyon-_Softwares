import { useEffect, useCallback, useMemo } from 'react'
import Sidebar from './components/Sidebar'
import FiltersBar from './components/FiltersBar'
import CoinsTable from './components/CoinsTable'
import useCoinStore from './store/useCoinStore'
import { coinService } from './services/api'
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
    balance,
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

      // Secondary client-side filtering for network consistency if needed
      let filteredData = data
      if (filters.network !== 'all') {
        const mappedChain = filters.network === 'bnb' ? 'bsc' : filters.network
        filteredData = filteredData.filter(p => p.chainId === mappedChain)
      }

      // Filter by DEX
      if (filters.dex !== 'all') {
        filteredData = filteredData.filter(p => p.dexId?.toLowerCase() === filters.dex.toLowerCase())
      }

      // Filter by Liquidity
      if (filters.liquidity !== 'all') {
        const minLiq = filters.liquidity.includes('10k') ? 10000 :
                       filters.liquidity.includes('100k') ? 100000 : 1000000
        filteredData = filteredData.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
      }

      // Filter by Market Cap (FDV)
      if (filters.marketCap !== 'all') {
        const mcap = filters.marketCap
        filteredData = filteredData.filter(p => {
          const val = p.fdv || 0
          if (mcap === 'micro') return val < 1000000
          if (mcap === 'small') return val >= 1000000 && val < 10000000
          if (mcap === 'mid') return val >= 10000000 && val < 100000000
          if (mcap === 'large') return val >= 100000000
          return true
        })
      }

      // Filter by Age
      if (filters.age !== 'all') {
        const now = Date.now()
        const hour = 3600000
        filteredData = filteredData.filter(p => {
          if (!p.pairCreatedAt) return false
          const ageMs = now - p.pairCreatedAt
          if (filters.age === '1h') return ageMs < hour
          if (filters.age === '6h') return ageMs < hour * 6
          if (filters.age === '24h') return ageMs < hour * 24
          if (filters.age === '7d') return ageMs < hour * 24 * 7
          return true
        })
      }

      // Filter by Verified
      if (filters.verified) {
        filteredData = filteredData.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0)
      }

      // Sorting
      filteredData.sort((a, b) => {
        if (filters.sortBy === 'mcap') return (b.fdv || 0) - (a.fdv || 0)
        if (filters.sortBy === 'volume') return (b.volume?.h24 || 0) - (a.volume?.h24 || 0)
        if (filters.sortBy === 'age') return (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0)
        return 0 // default trending is handled by API usually, or we can add custom logic
      })

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

  const stats = useMemo(() => {
    const trendingCount = coins.length
    const newListings = coins.filter(p => (Date.now() - (p.pairCreatedAt || 0)) < 86400000).length
    const safePairs = coins.filter(p => p.info?.websites?.length > 0).length
    const safePercent = trendingCount ? Math.round((safePairs / trendingCount) * 100) : 0

    return {
      trending: trendingCount.toLocaleString(),
      new: newListings.toLocaleString(),
      safe: `${safePercent}%`,
      volatility: coins.length > 50 ? 'High' : 'Moderate'
    }
  }, [coins])

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Trending Pairs" value={stats.trending} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New 24h" value={stats.new} icon={Zap} color="text-yellow-500" />
              <StatCard title="Safe/Verified" value={stats.safe} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Market Activity" value={stats.volatility} icon={Activity} color="text-red-500" />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h2 className="text-lg font-bold">Top Discoveries</h2>
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
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-primary">{address}</span>
                <span className="text-[10px] text-muted-foreground">{balance} ETH</span>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-all"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground animate-pulse">Indexing blockchain data...</p>
              </div>
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
  <div className="bg-card p-6 rounded-xl border border-border flex items-center justify-between hover:border-primary/50 transition-colors group">
    <div>
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
    <div className={cn("p-3 rounded-lg bg-secondary transition-transform group-hover:scale-110", color)}>
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
