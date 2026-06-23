import { useEffect, useCallback, useMemo } from 'react'
import Sidebar from './components/Sidebar'
import FiltersBar from './components/FiltersBar'
import CoinsTable from './components/CoinsTable'
import useCoinStore from './store/useCoinStore'
import { coinService } from './services/api'
import { TrendingUp, Activity, ShieldCheck, Zap } from 'lucide-react'
import { cn, getMappedChainId } from './lib/utils'
import { calculateTrendingScore } from './lib/trending'
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
    searchQuery,
    address,
    balance,
    connectWallet
  } = useCoinStore()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Fetch Global Trending for Dashboard
      const trendingData = await coinService.getTrending()
      setDashboardCoins(trendingData)

      // 2. Fetch Terminal Data based on active network or search
      let terminalData = []
      if (searchQuery) {
        terminalData = await coinService.searchPairs(searchQuery)
      } else if (filters.network !== 'all') {
        terminalData = await coinService.getPairsByChain(filters.network)
      } else {
        terminalData = trendingData
      }

      setCoins(terminalData)
    } catch (err) {
      setError('Failed to fetch data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filters.network, searchQuery, setCoins, setDashboardCoins, setError, setLoading])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Client-side filtering and sorting for the Terminal
  const filteredCoins = useMemo(() => {
    let result = [...coins]

    // Network Filter (Secondary check for search results)
    if (filters.network !== 'all') {
      const mappedChainId = getMappedChainId(filters.network)
      result = result.filter(p => p.chainId === mappedChainId)
    }

    // DEX Filter
    if (filters.dex !== 'all') {
      result = result.filter(p => p.dexId?.toLowerCase().includes(filters.dex.toLowerCase()))
    }

    // Age Filter
    if (filters.age !== 'all') {
      const now = Date.now()
      const limitHours = filters.age === '1h' ? 1 : filters.age === '6h' ? 6 : filters.age === '24h' ? 24 : 168
      result = result.filter(p => {
        if (!p.pairCreatedAt) return false
        return (now - p.pairCreatedAt) / 1000 / 60 / 60 <= limitHours
      })
    }

    // Liquidity Filter
    if (filters.liquidity !== 'all') {
      const minLiq = filters.liquidity === '10k' ? 10000 : filters.liquidity === '100k' ? 100000 : 1000000
      result = result.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
    }

    // Verified Filter (Mock heuristic: has websites or socials)
    if (filters.verified) {
      result = result.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0)
    }

    // Sorting
    result.sort((a, b) => {
      if (filters.sort === 'trending') {
        return calculateTrendingScore(b) - calculateTrendingScore(a)
      }
      if (filters.sort === 'mcap') {
        return (b.fdv || 0) - (a.fdv || 0)
      }
      if (filters.sort === 'volume') {
        return (b.volume?.h24 || 0) - (a.volume?.h24 || 0)
      }
      if (filters.sort === 'age') {
        return (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0)
      }
      return 0
    })

    return result
  }, [coins, filters])

  // Dashboard stats derived from data
  const stats = useMemo(() => {
    const totalPairs = dashboardCoins.length
    const newPairs = dashboardCoins.filter(p => {
       if (!p.pairCreatedAt) return false
       return (Date.now() - p.pairCreatedAt) / 1000 / 60 / 60 <= 24
    }).length
    const verifiedPairs = dashboardCoins.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0).length
    const verifiedPercent = totalPairs > 0 ? Math.round((verifiedPairs / totalPairs) * 100) : 0

    return {
      trending: totalPairs.toLocaleString(),
      new: newPairs.toString(),
      safe: `${verifiedPercent}%`,
      volatility: 'High'
    }
  }, [dashboardCoins])

  const formattedView = view === 'smart-money' ? 'smart money' : view

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Trending Pairs" value={stats.trending} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New 24h" value={stats.new} icon={Zap} color="text-yellow-500" />
              <StatCard title="Verified Tokens" value={stats.safe} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Market Activity" value={stats.volatility} icon={Activity} color="text-red-500" />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h2 className="text-lg font-bold">Top Trending Pairs</h2>
                <button
                  className="text-xs font-bold bg-secondary px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
                  onClick={() => fetchData()}
                >
                  REFRESH
                </button>
              </div>
              <CoinsTable data={dashboardCoins.slice(0, 10)} />
            </div>
          </div>
        )
      case 'coins':
        return (
          <div className="flex flex-col h-full overflow-hidden">
            <FiltersBar />
            <div className="flex-1 overflow-auto bg-card">
              <CoinsTable data={filteredCoins} />
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
             <h2 className="text-xl font-bold capitalize">{formattedView}</h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold tracking-widest">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              LIVE DATA
            </div>

            {address ? (
               <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter leading-none">Balance</p>
                    <p className="text-sm font-mono font-bold">{balance} ETH</p>
                  </div>
                  <div className="h-8 w-[1px] bg-border"></div>
                  <div className="bg-secondary px-4 py-1.5 rounded-lg border border-border font-mono text-xs font-bold">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </div>
               </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-xs font-bold tracking-wider hover:opacity-90 transition-opacity uppercase"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-hidden relative">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">Syncing Terminal</p>
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
  <div className="bg-card p-6 rounded-xl border border-border flex items-center justify-between group hover:border-primary/50 transition-colors">
    <div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
    <div className={cn("p-3 rounded-lg bg-secondary transition-colors group-hover:bg-primary/10", color)}>
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
