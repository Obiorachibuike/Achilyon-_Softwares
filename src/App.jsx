import { useEffect, useCallback, useMemo, useState } from 'react'
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
    view, coins, setCoins, loading, setLoading, setError,
    filters, searchQuery, address, balance, connectWallet, disconnectWallet
  } = useCoinStore()

  const [dashboardCoins, setDashboardCoins] = useState([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let data = []
      if (searchQuery) {
        data = await coinService.searchPairs(searchQuery)
      } else if (filters.network !== 'all') {
        data = await coinService.getPairsByChain(filters.network)
      } else {
        data = await coinService.getTrending()
      }

      // If we are on dashboard and haven't loaded dashboard coins yet, or if it's an initial load
      if (view === 'dashboard' && dashboardCoins.length === 0) {
        setDashboardCoins(data.slice(0, 20))
      }

      setCoins(data)
    } catch (err) {
      setError('Failed to fetch data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filters.network, searchQuery, setCoins, setError, setLoading, view, dashboardCoins.length])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Client-side filtering and sorting
  const filteredCoins = useMemo(() => {
    let result = [...coins]

    // Network filter (DexScreener search is broad, so we double check)
    if (filters.network !== 'all') {
      const mapped = filters.network === 'bnb' ? 'bsc' : filters.network
      result = result.filter(p => p.chainId === mapped)
    }

    // DEX filter
    if (filters.dex !== 'all') {
      result = result.filter(p => p.dexId?.toLowerCase().includes(filters.dex.toLowerCase()))
    }

    // Liquidity filter
    if (filters.liquidity !== 'all') {
      const minLiq = filters.liquidity === '10k' ? 10000 :
                     filters.liquidity === '100k' ? 100000 : 1000000
      result = result.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
    }

    // Age filter
    if (filters.age !== 'all') {
      const now = Date.now()
      const maxAgeMs = (filters.age === '1h' ? 1 :
                        filters.age === '6h' ? 6 :
                        filters.age === '24h' ? 24 : 168) * 60 * 60 * 1000
      result = result.filter(p => p.pairCreatedAt && (now - p.pairCreatedAt) <= maxAgeMs)
    }

    // Market Cap filter
    if (filters.marketCap !== 'all') {
      result = result.filter(p => {
        const mcap = p.fdv || 0
        if (filters.marketCap === 'micro') return mcap < 100000
        if (filters.marketCap === 'small') return mcap >= 100000 && mcap < 1000000
        if (filters.marketCap === 'mid') return mcap >= 1000000 && mcap < 10000000
        return mcap >= 10000000
      })
    }

    // Verified filter (simple heuristic: has info/socials)
    if (filters.verified) {
      result = result.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0)
    }

    // Sort
    result.sort((a, b) => {
      if (filters.sort === 'mcap') return (b.fdv || 0) - (a.fdv || 0)
      if (filters.sort === 'volume') return (b.volume?.h24 || 0) - (a.volume?.h24 || 0)
      if (filters.sort === 'age') return (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0)
      return 0 // Default 'trending' uses API order or internal trending score if we wanted to calculate it here
    })

    return result
  }, [coins, filters])

  const stats = useMemo(() => {
    const trendingCount = coins.length
    const newListings = coins.filter(p => {
      if (!p.pairCreatedAt) return false
      return (Date.now() - p.pairCreatedAt) < 24 * 60 * 60 * 1000
    }).length
    const verifiedPercent = coins.length > 0
      ? Math.round((coins.filter(p => p.info?.websites?.length > 0).length / coins.length) * 100)
      : 0

    return { trendingCount, newListings, verifiedPercent }
  }, [coins])

  const renderContent = () => {
    const formattedView = view.replace('-', ' ')

    switch (view) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Trending Pairs" value={stats.trendingCount.toLocaleString()} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New (24h)" value={stats.newListings.toString()} icon={Zap} color="text-yellow-500" />
              <StatCard title="Verified Tokens" value={`${stats.verifiedPercent}%`} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Market Status" value="Active" icon={Activity} color="text-red-500" />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/30">
                <h2 className="text-lg font-bold">Top Market Discovery</h2>
                <button
                  className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg font-bold hover:bg-primary/20 transition-colors"
                  onClick={() => fetchData()}
                >
                  REFRESH DATA
                </button>
              </div>
              <CoinsTable data={dashboardCoins} />
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
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
            <div className="p-4 bg-secondary rounded-full">
              <Activity size={48} className="text-primary/20" />
            </div>
            <p className="italic text-lg capitalize">{formattedView} Engine Initializing...</p>
            <p className="text-sm max-w-xs text-center opacity-60">
              We are connecting to real-time indexers to bring you live data for {formattedView}.
            </p>
          </div>
        )
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-card/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
             <h2 className="text-xl font-black uppercase tracking-tighter text-foreground">{view}</h2>
             <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black border border-green-500/20">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              NETWORK LIVE
            </div>
          </div>

          <div className="flex items-center gap-4">
            {address ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none">Balance</p>
                  <p className="text-sm font-black text-primary">{balance} ETH</p>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="bg-secondary text-foreground border border-border px-4 py-2 rounded-xl text-xs font-bold hover:bg-muted transition-all"
                >
                  {address}
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all shadow-lg shadow-primary/20 active:scale-95"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto relative">
          {loading && coins.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Syncing Chain Data</p>
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
  <div className="bg-card p-6 rounded-2xl border border-border flex items-center justify-between group hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/5">
    <div>
      <p className="text-[10px] font-black text-muted-foreground mb-1 uppercase tracking-widest">{title}</p>
      <p className="text-2xl font-black tracking-tight">{value}</p>
    </div>
    <div className={cn("p-4 rounded-2xl bg-secondary transition-colors group-hover:bg-primary/10", color)}>
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
