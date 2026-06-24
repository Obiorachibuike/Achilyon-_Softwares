import { useEffect, useCallback, useMemo } from 'react'
import Sidebar from './components/Sidebar'
import FiltersBar from './components/FiltersBar'
import CoinsTable from './components/CoinsTable'
import useCoinStore from './store/useCoinStore'
import { coinService } from './services/api'
import { TrendingUp, Activity, ShieldCheck, Zap } from 'lucide-react'
import { cn } from './lib/utils'
import { calculateTrendingScore } from './lib/trending'
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
    isConnected,
    connectWallet,
    disconnectWallet
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

      // Ensure we only have unique pairs by pairAddress
      const uniquePairs = Array.from(new Map(data.map(item => [item.pairAddress, item])).values())
      setCoins(uniquePairs)
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

  // Helper to normalize chain IDs for filtering
  const getMappedChainId = (internalId) => {
    const chainMap = {
      'bnb': 'bsc',
      'ethereum': 'ethereum',
      'base': 'base',
      'solana': 'solana',
      'arbitrum': 'arbitrum',
      'polygon': 'polygon',
      'avalanche': 'avalanche'
    }
    return chainMap[internalId] || internalId
  }

  // Client-side filtering and sorting
  const filteredCoins = useMemo(() => {
    let result = [...coins]

    // Network filter (extra check if search API returns multiple chains)
    if (filters.network !== 'all') {
        const targetChain = getMappedChainId(filters.network)
        result = result.filter(p => p.chainId === targetChain)
    }

    // DEX filter
    if (filters.dex !== 'all') {
        result = result.filter(p => p.dexId?.toLowerCase() === filters.dex || p.labels?.some(l => l.toLowerCase() === filters.dex))
    }

    // Age filter
    if (filters.age !== 'all') {
        const now = Date.now()
        const hour = 60 * 60 * 1000
        const limitMap = {
            '1h': hour,
            '6h': 6 * hour,
            '24h': 24 * hour,
            '7d': 7 * 24 * hour
        }
        const limit = limitMap[filters.age]
        result = result.filter(p => p.pairCreatedAt && (now - p.pairCreatedAt) < limit)
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
            const mcap = p.fdv || 0
            if (filters.marketCap === 'micro') return mcap < 1000000
            if (filters.marketCap === 'small') return mcap >= 1000000 && mcap < 10000000
            if (filters.marketCap === 'mid') return mcap >= 10000000 && mcap < 100000000
            if (filters.marketCap === 'large') return mcap >= 100000000
            return true
        })
    }

    // Volume filter
    if (filters.volume !== 'all') {
        result = result.filter(p => {
            const vol = filters.volume === '1h' ? (p.volume?.h1 || 0) : (p.volume?.h24 || 0)
            return vol > 5000 // Higher threshold for volume filter
        })
    }

    // Verified filter
    if (filters.verifiedOnly) {
        result = result.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0)
    }

    // Sorting
    result.sort((a, b) => {
        if (filters.sortBy === 'trending') {
            return calculateTrendingScore(b) - calculateTrendingScore(a)
        }
        if (filters.sortBy === 'mcap') {
            return (b.fdv || 0) - (a.fdv || 0)
        }
        if (filters.sortBy === 'volume') {
            return (b.volume?.h24 || 0) - (a.volume?.h24 || 0)
        }
        if (filters.sortBy === 'age') {
            return (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0)
        }
        return 0
    })

    return result
  }, [coins, filters])

  // Dashboard Stats
  const stats = useMemo(() => {
    const trendingCount = coins.filter(p => calculateTrendingScore(p) > 50).length
    const now = Date.now()
    const newListings = coins.filter(p => p.pairCreatedAt && (now - p.pairCreatedAt) < 24 * 60 * 60 * 1000).length
    const verifiedPairs = coins.filter(p => p.info?.websites?.length > 0).length
    const safeRate = coins.length > 0 ? Math.round((verifiedPairs / coins.length) * 100) : 0

    return {
        trending: trendingCount.toLocaleString(),
        new: newListings.toLocaleString(),
        safe: `${safeRate}%`,
        volatility: 'High'
    }
  }, [coins])

  const renderContent = () => {
    const formattedView = view.replace('-', ' ')
    switch (view) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Trending Pairs" value={stats.trending} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New Listings (24h)" value={stats.new} icon={Zap} color="text-yellow-500" />
              <StatCard title="Safe / Verified" value={stats.safe} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Market Volatility" value={stats.volatility} icon={Activity} color="text-red-500" />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
                <h2 className="text-lg font-bold">Top Trending Pairs</h2>
                <button
                  className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
                  onClick={() => fetchData()}
                >
                  REFRESH DATA
                </button>
              </div>
              <CoinsTable data={filteredCoins.slice(0, 10)} />
            </div>
          </div>
        )
      case 'coins':
      case 'trending':
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
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                 <Activity size={32} className="opacity-20" />
            </div>
            <p className="italic text-lg font-medium capitalize">{formattedView} view is under development...</p>
            <button
                onClick={() => useCoinStore.getState().setView('coins')}
                className="text-primary hover:underline text-sm font-bold"
            >
                Back to Discovery Terminal
            </button>
          </div>
        )
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4">
             <h2 className="text-xl font-bold capitalize">{view.replace('-', ' ')}</h2>
             <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              Live Data
            </div>
          </div>
          <div className="flex items-center gap-6">
            {isConnected ? (
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-1">Balance</p>
                  <p className="text-sm font-black leading-none">{balance} ETH</p>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="bg-secondary border border-border text-foreground px-4 py-2 rounded-lg text-sm font-bold hover:bg-muted transition-all"
                >
                  {address.slice(0, 6)}...{address.slice(-4)}
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 px-6 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-all active:scale-95"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-muted/10">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-primary/20"></div>
                <div className="w-12 h-12 rounded-full border-t-2 border-primary animate-spin absolute top-0 left-0"></div>
              </div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Syncing Chain Data...</p>
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
  <div className="bg-card p-6 rounded-xl border border-border flex items-center justify-between hover:border-primary/30 transition-colors cursor-default group">
    <div>
      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 group-hover:text-primary transition-colors">{title}</p>
      <p className="text-3xl font-black">{value}</p>
    </div>
    <div className={cn("p-4 rounded-xl bg-muted group-hover:bg-primary/10 transition-colors", color)}>
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
