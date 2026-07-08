import { useEffect, useCallback, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar'
import FiltersBar from './components/FiltersBar'
import CoinsTable from './components/CoinsTable'
import useCoinStore from './store/useCoinStore'
import { coinService } from './services/api'
import { TrendingUp, Activity, ShieldCheck, Zap, Wallet as WalletIcon } from 'lucide-react'
import { cn } from './lib/utils'
import { calculateTrendingScore } from './lib/trending'
import PropTypes from 'prop-types'

const App = () => {
  const {
    view,
    setView,
    coins,
    setCoins,
    loading,
    setLoading,
    setError,
    filters,
    wallet,
    connectWallet,
    disconnectWallet
  } = useCoinStore()

  const [dashboardCoins, setDashboardCoins] = useState([])

  // Fetch data specifically for the Terminal based on current filters
  const fetchTerminalData = useCallback(async () => {
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

      const pairsWithScores = data.map(pair => ({
        ...pair,
        trendingScore: calculateTrendingScore(pair)
      }))

      setCoins(pairsWithScores)
    } catch (err) {
      setError('Failed to fetch terminal data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filters.network, filters.searchQuery, setCoins, setError, setLoading])

  // Fetch global data for Dashboard (independent of filters)
  const fetchDashboardData = useCallback(async () => {
    try {
      const data = await coinService.getTrending()
      const pairsWithScores = data.map(pair => ({
        ...pair,
        trendingScore: calculateTrendingScore(pair)
      }))
      setDashboardCoins(pairsWithScores)
    } catch (err) {
      console.error("Dashboard fetch error", err)
    }
  }, [])

  // Trigger terminal fetch when network or search changes
  useEffect(() => {
    fetchTerminalData()
  }, [fetchTerminalData])

  // Initial load and periodic refresh for dashboard
  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 60000) // Refresh dashboard every minute
    return () => clearInterval(interval)
  }, [fetchDashboardData])

  const filteredCoins = useMemo(() => {
    let result = [...coins]

    // Network Filter (Secondary check if search was used)
    if (filters.network !== 'all') {
      result = result.filter(p => p.chainId === filters.network)
    }

    // DEX Filter
    if (filters.dex !== 'all') {
      result = result.filter(p => p.dexId?.toLowerCase().includes(filters.dex.toLowerCase()))
    }

    // Age Filter
    if (filters.age !== 'all') {
      const now = Date.now()
      const hours = filters.age === '1h' ? 1 : filters.age === '6h' ? 6 : filters.age === '24h' ? 24 : 168
      result = result.filter(p => p.pairCreatedAt && (now - p.pairCreatedAt) < hours * 60 * 60 * 1000)
    }

    // Liquidity Filter
    if (filters.liquidity !== 'all') {
      const minLiq = filters.liquidity === '10k' ? 10000 : filters.liquidity === '100k' ? 100000 : 1000000
      result = result.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
    }

    // Volume Filter
    if (filters.volume !== 'all') {
      const minVol = filters.volume === '10k' ? 10000 : filters.volume === '100k' ? 100000 : 1000000
      result = result.filter(p => parseFloat(p.volume?.h24 || 0) >= minVol)
    }

    // Market Cap Filter
    if (filters.marketCap !== 'all') {
      result = result.filter(p => {
        const mcap = parseFloat(p.fdv || 0)
        if (filters.marketCap === 'micro') return mcap < 1000000
        if (filters.marketCap === 'small') return mcap >= 1000000 && mcap < 10000000
        if (filters.marketCap === 'mid') return mcap >= 10000000 && mcap < 100000000
        if (filters.marketCap === 'large') return mcap >= 100000000
        return true
      })
    }

    // Verified Filter
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
    const trending = dashboardCoins.filter(c => (c.trendingScore || 0) >= 60).length
    const new24h = dashboardCoins.filter(c => (Date.now() - (c.pairCreatedAt || 0)) < 24 * 60 * 60 * 1000).length
    const safe = dashboardCoins.length > 0
      ? Math.round((dashboardCoins.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0).length / dashboardCoins.length) * 100)
      : 0

    return { trending, new24h, safe }
  }, [dashboardCoins])

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Trending Pairs" value={stats.trending.toString()} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New 24h" value={stats.new24h.toString()} icon={Zap} color="text-yellow-500" />
              <StatCard title="Safe/Verified" value={`${stats.safe}%`} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Global Pairs" value={dashboardCoins.length.toString()} icon={Activity} color="text-red-500" />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                <h2 className="text-lg font-bold">Global Market Activity</h2>
                <button
                  className="text-sm font-medium text-primary hover:bg-primary/10 px-3 py-1 rounded-md transition-colors"
                  onClick={() => fetchDashboardData()}
                >
                  Refresh Analytics
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
      default: {
        const formattedView = view.split('-').join(' ')
        return (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
               <Zap className="w-8 h-8 opacity-20" />
            </div>
            <p className="italic text-lg">{formattedView} view is under development...</p>
            <button
              onClick={() => setView('coins')}
              className="mt-4 text-primary hover:underline text-sm"
            >
              Go to Coins Terminal
            </button>
          </div>
        )
      }
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4">
             <h2 className="text-xl font-bold capitalize">{view.split('-').join(' ')}</h2>
             {view === 'coins' && (
               <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold border border-primary/20">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                LIVE TERMINAL
              </div>
             )}
          </div>
          <div className="flex items-center gap-4">
            {wallet.isConnected ? (
              <div className="flex items-center gap-4 bg-secondary/50 px-4 py-1.5 rounded-xl border border-border">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Balance</span>
                  <span className="text-sm font-bold">{wallet.balance} ETH</span>
                </div>
                <div className="h-8 w-px bg-border"></div>
                <button
                  onClick={disconnectWallet}
                  className="flex items-center gap-2 text-sm font-medium hover:text-red-500 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <WalletIcon size={16} />
                  </div>
                  <span className="max-w-[100px] truncate">{wallet.address}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-xl text-sm font-bold hover:opacity-90 shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-[#0a0a0a]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-2 h-2 bg-primary rounded-full animate-ping"></div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground font-medium animate-pulse">Streaming on-chain data...</p>
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
  <div className="bg-card p-6 rounded-xl border border-border flex items-center justify-between shadow-sm hover:border-primary/50 transition-colors group">
    <div>
      <p className="text-sm text-muted-foreground mb-1 font-medium">{title}</p>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
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
