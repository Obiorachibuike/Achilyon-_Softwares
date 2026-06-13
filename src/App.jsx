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
    connectWallet,
    disconnectWallet
  } = useCoinStore()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let data = []

      // Initial fetch based on network or trending
      if (filters.network !== 'all') {
        data = await coinService.getPairsByChain(filters.network)
      } else {
        data = await coinService.getTrending()
      }

      // 1. Client-side Search (Search query from store)
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase()
        data = data.filter(p =>
          p.baseToken.name?.toLowerCase().includes(query) ||
          p.baseToken.symbol?.toLowerCase().includes(query) ||
          p.baseToken.address?.toLowerCase().includes(query) ||
          p.pairAddress?.toLowerCase().includes(query)
        )
      }

      // 2. Network filtering (secondary check)
      if (filters.network !== 'all') {
        data = data.filter(p => p.chainId === filters.network || (filters.network === 'bnb' && p.chainId === 'bsc'))
      }

      // 3. Liquidity filtering
      if (filters.liquidity !== 'all') {
        const minLiq = filters.liquidity.includes('10k') ? 10000 :
                       filters.liquidity.includes('100k') ? 100000 : 1000000
        data = data.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
      }

      // 4. Age filtering
      if (filters.age !== 'all') {
        const now = Date.now()
        const oneHour = 60 * 60 * 1000
        const sixHours = 6 * oneHour
        const oneDay = 24 * oneHour
        const sevenDays = 7 * oneDay

        const maxAge = filters.age === '1h' ? oneHour :
                       filters.age === '6h' ? sixHours :
                       filters.age === '24h' ? oneDay : sevenDays

        data = data.filter(p => p.pairCreatedAt && (now - p.pairCreatedAt) <= maxAge)
      }

      // 5. Market Cap filtering
      if (filters.marketCap !== 'all') {
        data = data.filter(p => {
            const mcap = parseFloat(p.fdv || 0)
            if (filters.marketCap === 'micro') return mcap < 100000
            if (filters.marketCap === 'small') return mcap >= 100000 && mcap < 1000000
            if (filters.marketCap === 'mid') return mcap >= 1000000 && mcap < 10000000
            if (filters.marketCap === 'large') return mcap >= 10000000
            return true
        })
      }

      // 6. Verified filtering (mock logic: has at least 1 social link or website)
      if (filters.verified) {
        data = data.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0)
      }

      // 7. Sorting
      data.sort((a, b) => {
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

      setCoins(data)
    } catch (err) {
      setError('Failed to fetch data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filters, setCoins, setError, setLoading])

  useEffect(() => {
    fetchData()
  }, [fetchData, view]) // Re-fetch on view change too

  const dashboardStats = useMemo(() => {
    const trending = coins.filter(p => calculateTrendingScore(p) > 50).length
    const newListings = coins.filter(p => {
        const age = (Date.now() - (p.pairCreatedAt || 0)) / 1000 / 60 / 60
        return age < 24
    }).length
    const safePairs = coins.length > 0
        ? Math.round((coins.filter(p => p.info?.websites?.length > 0).length / coins.length) * 100)
        : 0

    return { trending, newListings, safePairs }
  }, [coins])

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Trending Pairs" value={dashboardStats.trending.toString()} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New (24h)" value={dashboardStats.newListings.toString()} icon={Zap} color="text-yellow-500" />
              <StatCard title="Safe/Verified" value={`${dashboardStats.safePairs}%`} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Market Volatility" value="High" icon={Activity} color="text-red-500" />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/30">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <TrendingUp size={20} className="text-primary" />
                    Top Market Pairs
                </h2>
                <button
                    className="text-xs font-bold bg-primary/10 text-primary px-3 py-1.5 rounded hover:bg-primary/20 transition-colors"
                    onClick={() => fetchData()}
                >
                    REFRESH DATA
                </button>
              </div>
              <CoinsTable data={coins.slice(0, 10)} />
            </div>
          </div>
        )
      case 'coins':
        return (
          <div className="flex flex-col h-full">
            <FiltersBar />
            <div className="flex-1 overflow-auto bg-background">
              <CoinsTable data={coins} />
            </div>
          </div>
        )
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="bg-secondary p-8 rounded-full mb-4">
                <Activity size={48} className="animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-1">{view.charAt(0).toUpperCase() + view.slice(1)} view</h3>
            <p className="italic">This feature is currently under development...</p>
          </div>
        )
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-card/50 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-4">
             <h2 className="text-xl font-black uppercase tracking-tighter text-primary">{view}</h2>
             <div className="h-4 w-px bg-border" />
             <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-bold">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              LIVE NETWORK
            </div>
          </div>

          <div className="flex items-center gap-6">
            {address ? (
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Balance</p>
                        <p className="text-sm font-mono font-bold text-primary">{balance} ETH</p>
                    </div>
                    <button
                        onClick={disconnectWallet}
                        className="bg-secondary border border-border text-foreground px-4 py-2 rounded-lg text-sm font-bold hover:bg-muted transition-colors font-mono"
                    >
                        {address}
                    </button>
                </div>
            ) : (
                <button
                    onClick={connectWallet}
                    className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-bold hover:opacity-90 shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                    CONNECT WALLET
                </button>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-secondary/10">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <Activity size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
              </div>
              <p className="text-xs font-bold text-muted-foreground animate-pulse tracking-widest uppercase">Fetching Market Data</p>
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
  <div className="bg-card p-6 rounded-xl border border-border flex items-center justify-between hover:border-primary/50 transition-colors group cursor-default">
    <div>
      <p className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-black">{value}</p>
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
