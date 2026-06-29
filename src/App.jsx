import { useEffect, useCallback, useMemo, useState } from 'react'
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
    view, coins, setCoins, loading, setLoading,
    setError, filters, isConnected, address,
    balance, connectWallet, disconnectWallet
  } = useCoinStore()

  const [dashboardCoins, setDashboardCoins] = useState([])

  const fetchData = useCallback(async (isInitial = false) => {
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

      // Pre-calculate trending scores
      const dataWithScores = data.map(pair => ({
        ...pair,
        trendingScore: calculateTrendingScore(pair)
      }))

      setCoins(dataWithScores)
      if (isInitial || view === 'dashboard') {
        setDashboardCoins(dataWithScores)
      }
    } catch (err) {
      setError('Failed to fetch data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filters.network, filters.searchQuery, setCoins, setError, setLoading, view])

  useEffect(() => {
    fetchData(true)
  }, [fetchData, filters.network, filters.searchQuery]) // Only refetch when network or search changes

  // Client-side filtering and sorting
  const filteredCoins = useMemo(() => {
    let result = [...coins]

    // 1. Filter by DEX
    if (filters.dex !== 'all') {
      result = result.filter(p => p.dexId?.toLowerCase() === filters.dex)
    }

    // 2. Filter by Age
    if (filters.age !== 'all') {
      const now = Date.now()
      const hourMs = 60 * 60 * 1000
      const limits = { '1h': 1, '6h': 6, '24h': 24, '7d': 168 }
      const maxAgeMs = limits[filters.age] * hourMs
      result = result.filter(p => p.pairCreatedAt && (now - p.pairCreatedAt) <= maxAgeMs)
    }

    // 3. Filter by Liquidity
    if (filters.liquidity !== 'all') {
      const minLiq = filters.liquidity === '10k' ? 10000 :
                     filters.liquidity === '100k' ? 100000 : 1000000
      result = result.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
    }

    // 4. Filter by Market Cap
    if (filters.marketCap !== 'all') {
      result = result.filter(p => {
        const fdv = parseFloat(p.fdv || 0)
        if (filters.marketCap === 'micro') return fdv < 1000000
        if (filters.marketCap === 'small') return fdv >= 1000000 && fdv < 10000000
        if (filters.marketCap === 'mid') return fdv >= 10000000 && fdv < 100000000
        if (filters.marketCap === 'large') return fdv >= 100000000
        return true
      })
    }

    // 5. Filter by Verified (Mock: has website or socials)
    if (filters.verified) {
      result = result.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0)
    }

    // Sorting
    result.sort((a, b) => {
      if (filters.sortBy === 'trending') return b.trendingScore - a.trendingScore
      if (filters.sortBy === 'mcap') return (b.fdv || 0) - (a.fdv || 0)
      if (filters.sortBy === 'volume') return (b.volume?.h24 || 0) - (a.volume?.h24 || 0)
      if (filters.sortBy === 'age') return (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0)
      return 0
    })

    return result
  }, [coins, filters])

  const stats = useMemo(() => {
    const trending = dashboardCoins.filter(c => c.trendingScore > 60).length
    const news = dashboardCoins.filter(c => {
      if (!c.pairCreatedAt) return false
      return (Date.now() - c.pairCreatedAt) < 24 * 60 * 60 * 1000
    }).length
    const verified = dashboardCoins.length > 0
      ? Math.round((dashboardCoins.filter(p => p.info?.websites?.length > 0).length / dashboardCoins.length) * 100)
      : 0

    return { trending, news, verified }
  }, [dashboardCoins])

  const renderContent = () => {
    const formattedView = view.replace('-', ' ')
    switch (view) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Trending Pairs" value={stats.trending.toString()} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New 24h" value={stats.news.toString()} icon={Zap} color="text-yellow-500" />
              <StatCard title="Verified" value={`${stats.verified}%`} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Active Scanners" value="12" icon={Activity} color="text-red-500" />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
                <h2 className="text-lg font-bold">Live Market Discovery</h2>
                <button
                  className="text-xs font-bold bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
                  onClick={() => fetchData()}
                >
                  REFRESH DATA
                </button>
              </div>
              <CoinsTable data={dashboardCoins.slice(0, 10)} />
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
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
               <Activity size={32} />
            </div>
            <h3 className="text-xl font-bold text-foreground capitalize mb-2">{formattedView} Terminal</h3>
            <p className="italic">Advanced indexing for {formattedView} is currently in progress...</p>
          </div>
        )
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-card/50 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center space-y-1">
             <h2 className="text-xl font-black capitalize tracking-tight">{view}</h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black border border-green-500/20">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              NETWORK LIVE
            </div>
            {isConnected ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden md:block">
                  <div className="text-xs font-bold text-foreground">{balance} ETH</div>
                  <div className="text-[10px] text-muted-foreground font-medium">{address.slice(0, 6)}...{address.slice(-4)}</div>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="bg-secondary text-foreground px-4 py-2 rounded-lg text-xs font-bold border border-border hover:bg-muted transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-xs font-bold hover:opacity-90 shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          {loading && coins.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
              <p className="text-sm font-bold text-muted-foreground animate-pulse tracking-widest uppercase">Initializing Indexer</p>
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
  <div className="bg-card p-6 rounded-xl border border-border flex items-center justify-between shadow-sm hover:border-primary/30 transition-colors group">
    <div>
      <p className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">{title}</p>
      <p className="text-3xl font-black tracking-tight">{value}</p>
    </div>
    <div className={cn("p-4 rounded-xl bg-secondary group-hover:scale-110 transition-transform", color)}>
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
