import { useEffect, useCallback, useMemo } from 'react'
import Sidebar from './components/Sidebar'
import FiltersBar from './components/FiltersBar'
import CoinsTable from './components/CoinsTable'
import AISummary from './components/AISummary'
import useCoinStore from './store/useCoinStore'
import { coinService } from './services/api'
import { calculateTrendingScore } from './lib/trending'
import { TrendingUp, Activity, ShieldCheck, Zap, Wallet } from 'lucide-react'
import { cn, getMappedChainId } from './lib/utils'
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
    isConnected,
    connectWallet,
    disconnectWallet
  } = useCoinStore()

  const fetchData = useCallback(async (isInitial = false) => {
    setLoading(true)
    try {
      let data = []
      // Use search API if there is a query, otherwise use chain or trending
      if (filters.searchQuery) {
        data = await coinService.searchPairs(filters.searchQuery)
      } else if (filters.network !== 'all') {
        data = await coinService.getPairsByChain(filters.network)
      } else {
        data = await coinService.getTrending()
      }

      // Secondary client-side network filtering to ensure strictness
      if (filters.network !== 'all' && !filters.searchQuery) {
        const mappedId = getMappedChainId(filters.network)
        data = data.filter(p => p.chainId === mappedId)
      }

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
  }, [filters.network, filters.searchQuery, view, setCoins, setDashboardCoins, setError, setLoading])

  useEffect(() => {
    // Initial load and re-fetch only if network or search changes
    const isInitial = coins.length === 0
    fetchData(isInitial)
  }, [fetchData, filters.network, filters.searchQuery, coins.length])

  // Advanced client-side filtering and sorting
  const processedCoins = useMemo(() => {
    let filtered = [...coins]

    // 1. Age Filter
    if (filters.age !== 'all') {
      const hours = filters.age.includes('1h') ? 1 :
                    filters.age.includes('6h') ? 6 :
                    filters.age.includes('24h') ? 24 : 168
      filtered = filtered.filter(p => {
        if (!p.pairCreatedAt) return false
        const ageHours = (Date.now() - p.pairCreatedAt) / 1000 / 60 / 60
        return ageHours <= hours
      })
    }

    // 2. Liquidity Filter
    if (filters.liquidity !== 'all') {
      const minLiq = filters.liquidity.includes('10k') ? 10000 :
                     filters.liquidity.includes('100k') ? 100000 : 1000000
      filtered = filtered.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
    }

    // 3. Market Cap Filter
    if (filters.marketCap !== 'all') {
      filtered = filtered.filter(p => {
        const fdv = parseFloat(p.fdv || 0)
        if (filters.marketCap === 'micro') return fdv < 1000000
        if (filters.marketCap === 'small') return fdv >= 1000000 && fdv < 10000000
        if (filters.marketCap === 'mid') return fdv >= 10000000 && fdv < 100000000
        if (filters.marketCap === 'large') return fdv >= 100000000
        return true
      })
    }

    // 4. DEX Filter
    if (filters.dex !== 'all') {
      filtered = filtered.filter(p => p.dexId?.toLowerCase() === filters.dex)
    }

    // 5. Verified Filter
    if (filters.verified) {
      filtered = filtered.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0)
    }

    // 6. Sorting
    filtered.sort((a, b) => {
      if (filters.sort === 'trending') {
        return calculateTrendingScore(b) - calculateTrendingScore(a)
      }
      if (filters.sort === 'mcap') {
        return (parseFloat(b.fdv || 0)) - (parseFloat(a.fdv || 0))
      }
      if (filters.sort === 'volume') {
        return (parseFloat(b.volume?.h24 || 0)) - (parseFloat(a.volume?.h24 || 0))
      }
      if (filters.sort === 'age') {
        return (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0)
      }
      return 0
    })

    return filtered
  }, [coins, filters])

  // Stats for Dashboard
  const stats = useMemo(() => {
    const trending = dashboardCoins.filter(p => calculateTrendingScore(p) >= 60).length
    const new24h = dashboardCoins.filter(p => {
      if (!p.pairCreatedAt) return false
      return (Date.now() - p.pairCreatedAt) < 86400000
    }).length
    const safe = dashboardCoins.length > 0
      ? Math.round((dashboardCoins.filter(p => p.info?.websites?.length > 0).length / dashboardCoins.length) * 100)
      : 0

    return { trending, new24h, safe }
  }, [dashboardCoins])

  const renderContent = () => {
    const formattedView = view.replace('-', ' ')

    switch (view) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Trending Pairs" value={stats.trending.toString()} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New 24h" value={stats.new24h.toString()} icon={Zap} color="text-yellow-500" />
              <StatCard title="Verified" value={`${stats.safe}%`} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Market Pairs" value={dashboardCoins.length.toString()} icon={Activity} color="text-red-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2 bg-card rounded-xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
                  <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp size={16} className="text-primary" />
                    Top Trending Pairs
                  </h2>
                  <button className="text-[10px] font-bold text-primary hover:underline uppercase" onClick={() => fetchData(true)}>Refresh</button>
                </div>
                <CoinsTable data={dashboardCoins.slice(0, 8)} />
              </div>

              <div className="space-y-6">
                <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                   <h2 className="text-sm font-bold uppercase tracking-wider">Terminal Intelligence</h2>
                   <AISummary token={dashboardCoins[0]} />
                </div>

                <div className="bg-primary/10 rounded-xl border border-primary/20 p-5">
                   <h3 className="font-bold text-primary mb-2 flex items-center gap-2">
                     <Zap size={16} />
                     Alpha Discovery
                   </h3>
                   <p className="text-xs text-muted-foreground leading-relaxed">
                     Our algorithm detected {stats.trending} high-velocity pairs in the last hour. Connect your wallet to enable automated alerts.
                   </p>
                </div>
              </div>
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
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
               <Activity size={32} className="opacity-20" />
            </div>
            <p className="italic text-sm capitalize">{formattedView} view is under development...</p>
          </div>
        )
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-4">
             <h2 className="text-lg font-bold capitalize tracking-tight">{view}</h2>
             <div className="flex items-center gap-2 px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
                LIVE
              </div>
          </div>

          <div className="flex items-center gap-6">
            {isConnected ? (
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                   <p className="text-[10px] text-muted-foreground font-bold uppercase">Balance</p>
                   <p className="text-xs font-mono font-bold">4.28 ETH</p>
                </div>
                <div className="flex items-center gap-3 bg-secondary px-4 py-2 rounded-lg border border-border">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs font-mono">{address.substring(0, 6)}...{address.substring(38)}</span>
                  <button onClick={disconnectWallet} className="text-muted-foreground hover:text-red-500 transition-colors">
                    <Activity size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-xs font-bold hover:opacity-90 flex items-center gap-2 transition-all active:scale-95"
              >
                <Wallet size={16} />
                CONNECT WALLET
              </button>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-muted/10">
          {loading && coins.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Indexing Blockchain...</p>
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
  <div className="bg-card p-5 rounded-xl border border-border flex items-center justify-between hover:border-primary/30 transition-colors cursor-default">
    <div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
      <p className="text-xl font-bold font-mono">{value}</p>
    </div>
    <div className={cn("p-2.5 rounded-lg bg-secondary", color)}>
      <Icon size={20} />
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
