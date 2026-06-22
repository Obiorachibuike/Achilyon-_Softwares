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
    dashboardCoins,
    setDashboardCoins,
    loading,
    setLoading,
    setError,
    filters,
    address,
    balance,
    isConnected,
    connectWallet
  } = useCoinStore()

  // Fetch base data only when network or search query changes
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

      setCoins(data)

      // If we are on dashboard or it's the first load, also update dashboard data
      if (view === 'dashboard' || dashboardCoins.length === 0) {
          setDashboardCoins(data)
      }
    } catch (err) {
      setError('Failed to fetch data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filters.network, filters.searchQuery, view, setCoins, setDashboardCoins, setError, setLoading, dashboardCoins.length])

  useEffect(() => {
    fetchData()
  }, [filters.network, filters.searchQuery, view]) // Only fetch when these change

  // Apply client-side filters and sorting
  const filteredCoins = useMemo(() => {
    let result = [...coins]

    // Network filter (extra safety if search was broad)
    if (filters.network !== 'all') {
      const mappedChain = filters.network === 'bnb' ? 'bsc' : filters.network
      result = result.filter(p => p.chainId === mappedChain)
    }

    // DEX filter
    if (filters.dex !== 'all') {
      result = result.filter(p => p.dexId?.toLowerCase().includes(filters.dex.toLowerCase()))
    }

    // Age filter
    if (filters.age !== 'all') {
      const now = Date.now()
      const ageLimit = filters.age === '1h' ? 3600000 :
                         filters.age === '6h' ? 21600000 :
                         filters.age === '24h' ? 86400000 :
                         604800000 // 7d
      result = result.filter(p => p.pairCreatedAt && (now - p.pairCreatedAt) <= ageLimit)
    }

    // Liquidity filter
    if (filters.liquidity !== 'all') {
      const minLiq = filters.liquidity === '10k' ? 10000 :
                     filters.liquidity === '100k' ? 100000 : 1000000
      result = result.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
    }

    // Market Cap filter
    if (filters.marketCap !== 'all') {
      result = result.filter(p => {
        const mcap = parseFloat(p.fdv || 0)
        if (filters.marketCap === 'micro') return mcap < 100000
        if (filters.marketCap === 'small') return mcap >= 100000 && mcap < 1000000
        if (filters.marketCap === 'mid') return mcap >= 1000000 && mcap < 10000000
        if (filters.marketCap === 'large') return mcap >= 10000000
        return true
      })
    }

    // Volume filter
    if (filters.volume !== 'all') {
      const minVol = filters.volume === '10k' ? 10000 :
                     filters.volume === '100k' ? 100000 : 1000000
      result = result.filter(p => parseFloat(p.volume?.h24 || 0) >= minVol)
    }

    // Verified filter
    if (filters.verified) {
      result = result.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0)
    }

    // Sorting
    result.sort((a, b) => {
      if (filters.sortBy === 'trending') {
        return calculateTrendingScore(b) - calculateTrendingScore(a)
      }
      if (filters.sortBy === 'mcap') {
        return parseFloat(b.fdv || 0) - parseFloat(a.fdv || 0)
      }
      if (filters.sortBy === 'volume') {
        return parseFloat(b.volume?.h24 || 0) - parseFloat(a.volume?.h24 || 0)
      }
      if (filters.sortBy === 'age') {
        return (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0)
      }
      return 0
    })

    return result
  }, [coins, filters])

  // Stats for dashboard (calculated from dashboardCoins which isn't filtered by current view filters)
  const stats = useMemo(() => {
    const trendingCount = dashboardCoins.filter(c => calculateTrendingScore(c) > 50).length
    const newListings = dashboardCoins.filter(c => (Date.now() - (c.pairCreatedAt || 0)) < 86400000).length
    const safeCount = dashboardCoins.filter(c => c.info?.websites?.length > 0).length
    const safePercent = dashboardCoins.length > 0 ? Math.round((safeCount / dashboardCoins.length) * 100) : 0

    return {
      trending: trendingCount,
      new: newListings,
      safe: `${safePercent}%`,
      volatility: 'High'
    }
  }, [dashboardCoins])

  const formattedView = view.replace('-', ' ')

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Trending Pairs" value={stats.trending.toString()} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New Listings (24h)" value={stats.new.toString()} icon={Zap} color="text-yellow-500" />
              <StatCard title="Safe/Verified Pairs" value={stats.safe} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Market Volatility" value={stats.volatility} icon={Activity} color="text-red-500" />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp size={20} className="text-primary" />
                  Top Market Pairs
                </h2>
                <button
                  className="text-xs font-bold uppercase tracking-wider text-primary hover:opacity-80 px-3 py-1 bg-primary/10 rounded"
                  onClick={() => fetchData()}
                >
                  Refresh Data
                </button>
              </div>
              <CoinsTable data={dashboardCoins.slice(0, 15)} />
            </div>
          </div>
        )
      case 'coins':
        return (
          <div className="flex flex-col h-full">
            <FiltersBar />
            <div className="flex-1 overflow-auto bg-card">
              <CoinsTable data={filteredCoins} />
            </div>
          </div>
        )
      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground italic">
            {formattedView.charAt(0).toUpperCase() + formattedView.slice(1)} view is under development...
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
             <h2 className="text-xl font-black capitalize tracking-tight">{formattedView}</h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black tracking-widest">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              LIVE DATA
            </div>
            {isConnected ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold truncate max-w-[100px] font-mono">{address}</div>
                  <div className="text-[10px] text-muted-foreground font-bold">{balance} ETH</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-blue-500 shadow-lg shadow-primary/20 border border-white/10" />
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-95"
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
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Indexing Chain...</span>
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
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{title}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
    <div className={cn("p-3 rounded-xl bg-secondary group-hover:scale-110 transition-transform", color)}>
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
