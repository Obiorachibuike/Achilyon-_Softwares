import { useEffect, useCallback, useMemo } from 'react'
import Sidebar from './components/Sidebar'
import FiltersBar from './components/FiltersBar'
import CoinsTable from './components/CoinsTable'
import useCoinStore from './store/useCoinStore'
import { coinService } from './services/api'
import { TrendingUp, Activity, ShieldCheck, Zap } from 'lucide-react'
import { calculateTrendingScore } from './lib/trending'
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
      // If there is a search query, prioritize searching
      if (filters.searchQuery) {
        data = await coinService.searchPairs(filters.searchQuery)
      } else if (filters.network !== 'all') {
        data = await coinService.getPairsByChain(filters.network)
      } else {
        data = await coinService.getTrending()
      }

      setCoins(data)
    } catch (err) {
      setError('Failed to fetch data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filters.network, filters.searchQuery, setCoins, setError, setLoading])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Client-side filtering and sorting
  const filteredAndSortedCoins = useMemo(() => {
    let result = [...coins]

    // Filter by DEX
    if (filters.dex !== 'all') {
      result = result.filter(p => p.dexId?.toLowerCase() === filters.dex)
    }

    // Filter by Age
    if (filters.age !== 'all') {
      const now = Date.now()
      const limitMap = {
        '< 1h': 1 * 60 * 60 * 1000,
        '< 6h': 6 * 60 * 60 * 1000,
        '< 24h': 24 * 60 * 60 * 1000,
        '< 7d': 7 * 24 * 60 * 60 * 1000,
      }
      const limit = limitMap[filters.age]
      result = result.filter(p => p.pairCreatedAt && (now - p.pairCreatedAt) <= limit)
    }

    // Filter by Liquidity
    if (filters.liquidity !== 'all') {
      const minLiq = filters.liquidity.includes('10k') ? 10000 :
                     filters.liquidity.includes('100k') ? 100000 : 1000000
      result = result.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
    }

    // Filter by Market Cap
    if (filters.marketCap !== 'all') {
        result = result.filter(p => {
            const fdv = parseFloat(p.fdv || 0)
            if (filters.marketCap.includes('Micro')) return fdv < 1000000
            if (filters.marketCap.includes('Small')) return fdv >= 1000000 && fdv < 10000000
            if (filters.marketCap.includes('Mid')) return fdv >= 10000000 && fdv < 100000000
            if (filters.marketCap.includes('Large')) return fdv >= 100000000
            return true
        })
    }

    // Filter by Verified
    if (filters.verifiedOnly) {
        // Mock verification: pairs with social links or websites are considered "verified"
        result = result.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0)
    }

    // Sort
    result.sort((a, b) => {
        if (filters.sort === 'trending') {
            return calculateTrendingScore(b) - calculateTrendingScore(a)
        }
        if (filters.sort === 'mcap') {
            return parseFloat(b.fdv || 0) - parseFloat(a.fdv || 0)
        }
        if (filters.sort === 'volume') {
            return parseFloat(b.volume?.h24 || 0) - parseFloat(a.volume?.h24 || 0)
        }
        if (filters.sort === 'age') {
            return (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0)
        }
        return 0
    })

    return result
  }, [coins, filters])

  const stats = useMemo(() => {
    const trending = coins.filter(p => calculateTrendingScore(p) > 60).length
    const newListings = coins.filter(p => p.pairCreatedAt && (Date.now() - p.pairCreatedAt) < 24 * 60 * 60 * 1000).length
    const safePairs = coins.length > 0
        ? Math.round((coins.filter(p => p.info?.websites?.length > 0).length / coins.length) * 100)
        : 0

    return { trending, newListings, safePairs }
  }, [coins])

  const renderContent = () => {
    switch (view) {
      case 'dashboard': {
        return (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Trending Pairs" value={stats.trending.toString()} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New Listings (24h)" value={stats.newListings.toString()} icon={Zap} color="text-yellow-500" />
              <StatCard title="Safe Pairs" value={`${stats.safePairs}%`} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Market Volatility" value="High" icon={Activity} color="text-red-500" />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/30">
                <h2 className="text-lg font-bold">Market Discovery</h2>
                <button className="text-xs font-bold text-primary hover:underline bg-primary/10 px-3 py-1 rounded-full" onClick={() => fetchData()}>
                    REFRESH DATA
                </button>
              </div>
              <CoinsTable data={filteredAndSortedCoins.slice(0, 10)} />
            </div>
          </div>
        )
      }
      case 'coins':
      case 'trending': {
        return (
          <div className="flex flex-col h-full">
            <FiltersBar />
            <div className="flex-1 overflow-auto bg-card">
              <CoinsTable data={filteredAndSortedCoins} />
            </div>
          </div>
        )
      }
      default: {
        return (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="w-16 h-16 mb-4 rounded-full bg-secondary flex items-center justify-center">
                <Activity size={32} />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1 capitalize">{view.replace('-', ' ')}</h3>
            <p className="text-sm italic">This module is currently being indexed...</p>
          </div>
        )
      }
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-card/50 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-4">
             <h2 className="text-xl font-black tracking-tighter uppercase">{view}</h2>
             <div className="h-4 w-px bg-border"></div>
             <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Network Status: Operational
             </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black tracking-widest">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
              LIVE DATA STREAM
            </div>
            <button
                onClick={connectWallet}
                className={cn(
                    "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                    address
                        ? "bg-secondary text-foreground border border-border"
                        : "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20"
                )}
            >
              {address || 'Connect Wallet'}
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-secondary/10">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              <p className="text-xs font-bold text-muted-foreground tracking-widest animate-pulse">SYNCING WITH MULTI-CHAIN INDEXERS...</p>
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
  <div className="bg-card p-6 rounded-xl border border-border flex items-center justify-between shadow-sm hover:border-primary/20 transition-colors">
    <div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{title}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
    <div className={cn("p-3 rounded-xl bg-secondary", color)}>
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
