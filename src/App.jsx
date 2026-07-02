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
    wallet,
    connectWallet
  } = useCoinStore()

  const fetchData = useCallback(async (isInitial = false) => {
    setLoading(true)
    try {
      let data = []

      // 1. Fetch data based on Network or Search Query
      if (filters.searchQuery) {
        data = await coinService.searchPairs(filters.searchQuery)
      } else if (filters.network !== 'all') {
        data = await coinService.getPairsByChain(filters.network)
      } else {
        data = await coinService.getTrending()
      }

      // Update dashboard coins if it's initial load or we are on dashboard
      if (isInitial || view === 'dashboard') {
        setDashboardCoins(data)
      }

      setCoins(data)
    } catch (err) {
      setError('Failed to fetch data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filters.network, filters.searchQuery, setCoins, setDashboardCoins, setError, setLoading, view])

  useEffect(() => {
    fetchData(true)
  }, [filters.network, filters.searchQuery, fetchData])

  // Apply semantic filters and sorting client-side
  const processedCoins = useMemo(() => {
    let result = [...coins]

    // Network Filter (redundant if fetched by chain, but good for Search)
    if (filters.network !== 'all') {
      const mappedChain = filters.network === 'bnb' ? 'bsc' : filters.network
      result = result.filter(p => p.chainId === mappedChain)
    }

    // DEX Filter
    if (filters.dex !== 'all') {
      result = result.filter(p => p.dexId?.toLowerCase().includes(filters.dex.toLowerCase()))
    }

    // Age Filter
    if (filters.age !== 'all') {
      const now = Date.now()
      const hoursMap = {
        '< 1h': 1,
        '< 6h': 6,
        '< 24h': 24,
        '< 7d': 168
      }
      const maxHours = hoursMap[filters.age]
      result = result.filter(p => {
        if (!p.pairCreatedAt) return false
        const ageHours = (now - p.pairCreatedAt) / 1000 / 60 / 60
        return ageHours <= maxHours
      })
    }

    // Liquidity Filter
    if (filters.liquidity !== 'all') {
      const minLiq = filters.liquidity.includes('10k') ? 10000 :
                     filters.liquidity.includes('100k') ? 100000 : 1000000
      result = result.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
    }

    // Market Cap Filter
    if (filters.marketCap !== 'all') {
      result = result.filter(p => {
        const fdv = parseFloat(p.fdv || 0)
        switch (filters.marketCap) {
          case 'micro': return fdv < 1000000
          case 'small': return fdv >= 1000000 && fdv < 10000000
          case 'mid': return fdv >= 10000000 && fdv < 100000000
          case 'large': return fdv >= 100000000
          default: return true
        }
      })
    }

    // Volume Filter
    if (filters.volume !== 'all') {
      const minVol = filters.volume.includes('10k') ? 10000 :
                     filters.volume.includes('100k') ? 100000 : 1000000
      result = result.filter(p => parseFloat(p.volume?.h24 || 0) >= minVol)
    }

    // Verified Filter
    if (filters.verifiedOnly) {
      result = result.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0)
    }

    // Sorting
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'mcap': return (b.fdv || 0) - (a.fdv || 0)
        case 'volume': return (b.volume?.h24 || 0) - (a.volume?.h24 || 0)
        case 'age': return (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0)
        case 'trending':
        default:
          return calculateTrendingScore(b) - calculateTrendingScore(a)
      }
    })

    return result
  }, [coins, filters])

  // Dashboard Stats
  const stats = useMemo(() => {
    const trendingCount = dashboardCoins.filter(p => calculateTrendingScore(p) > 50).length
    const newListings = dashboardCoins.filter(p => p.pairCreatedAt && (Date.now() - p.pairCreatedAt) < 86400000).length
    const verifiedPercent = dashboardCoins.length > 0
      ? Math.round((dashboardCoins.filter(p => p.info?.websites?.length > 0).length / dashboardCoins.length) * 100)
      : 0

    return [
      { title: "Trending Pairs", value: trendingCount.toString(), icon: TrendingUp, color: "text-blue-500" },
      { title: "New 24h", value: newListings.toString(), icon: Zap, color: "text-yellow-500" },
      { title: "Verified", value: `${verifiedPercent}%`, icon: ShieldCheck, color: "text-green-500" },
      { title: "Active Markets", value: dashboardCoins.length.toString(), icon: Activity, color: "text-red-500" },
    ]
  }, [dashboardCoins])

  const renderContent = () => {
    const formattedView = view.replace('-', ' ')

    switch (view) {
      case 'dashboard':
        return (
          <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map(stat => (
                <StatCard key={stat.title} {...stat} />
              ))}
            </div>

            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
              <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                <div>
                   <h2 className="text-xl font-bold">Top Trending Pairs</h2>
                   <p className="text-xs text-muted-foreground mt-1">Real-time market activity across all chains</p>
                </div>
                <button
                  className="px-4 py-2 bg-secondary hover:bg-muted text-foreground text-sm font-bold rounded-lg transition-colors border border-border"
                  onClick={() => fetchData()}
                >
                  Refresh Data
                </button>
              </div>
              <CoinsTable data={dashboardCoins.slice(0, 10)} />
            </div>
          </div>
        )
      case 'coins':
      case 'trending':
        return (
          <div className="flex flex-col h-full">
            <FiltersBar />
            <div className="flex-1 overflow-auto bg-card">
              <CoinsTable data={processedCoins} />
            </div>
          </div>
        )
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <Activity size={32} className="opacity-20" />
            </div>
            <p className="italic font-medium">The <span className="capitalize text-foreground not-italic">{formattedView}</span> view is currently under construction.</p>
          </div>
        )
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 border-b border-border flex items-center justify-between px-8 bg-card/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex flex-col">
             <h2 className="text-2xl font-black capitalize tracking-tight">{view.replace('-', ' ')}</h2>
             <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                System Operational
             </div>
          </div>
          <div className="flex items-center gap-6">
            {wallet.connected ? (
              <div className="flex items-center gap-4 bg-secondary px-4 py-2 rounded-xl border border-border">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Balance</p>
                  <p className="text-sm font-black text-primary">{wallet.balance} ETH</p>
                </div>
                <div className="h-8 w-px bg-border"></div>
                <p className="text-xs font-mono font-bold bg-muted px-2 py-1 rounded">
                  {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                </p>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-muted/10">
          {loading && coins.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                </div>
              </div>
              <p className="text-sm font-bold text-muted-foreground animate-pulse uppercase tracking-widest">Indexing Blockchain Data...</p>
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
  <div className="bg-card p-6 rounded-2xl border border-border flex items-center justify-between shadow-sm hover:border-primary/50 transition-colors group">
    <div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{title}</p>
      <p className="text-3xl font-black tracking-tighter">{value}</p>
    </div>
    <div className={cn("p-4 rounded-2xl bg-secondary transition-transform group-hover:scale-110", color)}>
      <Icon size={28} />
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
