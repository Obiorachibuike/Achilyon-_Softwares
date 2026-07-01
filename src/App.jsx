import { useEffect, useCallback, useMemo } from 'react'
import Sidebar from './components/Sidebar'
import FiltersBar from './components/FiltersBar'
import CoinsTable from './components/CoinsTable'
import useCoinStore from './store/useCoinStore'
import { coinService } from './services/api'
import { TrendingUp, Activity, ShieldCheck, Zap } from 'lucide-react'
import { cn } from './lib/utils'
import { calculateTrendingScore, sortPairs } from './lib/trending'
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
    connectWallet,
    disconnectWallet
  } = useCoinStore()

  const fetchData = useCallback(async (isInitial = false) => {
    setLoading(true)
    try {
      let data = []

      // If there's a search query, prioritize it
      if (filters.searchQuery) {
        data = await coinService.searchPairs(filters.searchQuery)
      } else if (filters.network !== 'all') {
        data = await coinService.getPairsByChain(filters.network)
      } else {
        data = await coinService.getTrending()
      }

      const processedData = data.map(pair => ({
        ...pair,
        trendingScore: calculateTrendingScore(pair)
      }))

      if (isInitial || view === 'dashboard') {
        setDashboardCoins(processedData)
      }

      setCoins(processedData)
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

  // Client-side filtering and sorting
  const filteredCoins = useMemo(() => {
    let result = [...coins]

    // Network filter (extra safety if API is broad)
    if (filters.network !== 'all') {
      const mapped = filters.network === 'bnb' ? 'bsc' : filters.network
      result = result.filter(p => p.chainId === mapped)
    }

    // DEX filter
    if (filters.dex !== 'all') {
      result = result.filter(p => p.dexId?.toLowerCase().includes(filters.dex.toLowerCase()))
    }

    // Age filter
    if (filters.age !== 'all') {
      const now = Date.now()
      const hours = filters.age === '1h' ? 1 : filters.age === '6h' ? 6 : filters.age === '24h' ? 24 : 168
      result = result.filter(p => p.pairCreatedAt && (now - p.pairCreatedAt) < (hours * 60 * 60 * 1000))
    }

    // Liquidity filter
    if (filters.liquidity !== 'all') {
      const minLiq = filters.liquidity === '10k' ? 10000 : filters.liquidity === '100k' ? 100000 : 1000000
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

    // Verified filter (mock: has website or social)
    if (filters.verified) {
      result = result.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0)
    }

    return sortPairs(result, filters.sortBy)
  }, [coins, filters])

  const stats = useMemo(() => {
    const trending = dashboardCoins.filter(p => p.trendingScore >= 60).length
    const newPairs = dashboardCoins.filter(p => p.pairCreatedAt && (Date.now() - p.pairCreatedAt) < 24 * 60 * 60 * 1000).length
    const safePercent = dashboardCoins.length > 0
      ? Math.round((dashboardCoins.filter(p => p.info?.websites?.length > 0).length / dashboardCoins.length) * 100)
      : 0

    return { trending, newPairs, safePercent }
  }, [dashboardCoins])

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Trending Pairs" value={stats.trending.toString()} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New 24h" value={stats.newPairs.toString()} icon={Zap} color="text-yellow-500" />
              <StatCard title="Safe/Verified" value={`${stats.safePercent}%`} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Market Volatility" value="High" icon={Activity} color="text-red-500" />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h2 className="text-lg font-bold">Top Trending Pairs</h2>
                <button className="text-sm text-primary hover:underline" onClick={() => fetchData()}>Refresh</button>
              </div>
              <CoinsTable data={sortPairs(dashboardCoins, 'trending').slice(0, 10)} />
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
        const formattedView = view.replace('-', ' ')
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground italic">
            {formattedView.charAt(0).toUpperCase() + formattedView.slice(1)} view is under development...
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
          <div className="flex items-center space-y-1">
             <h2 className="text-xl font-bold capitalize">{view.replace('-', ' ')}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              LIVE
            </div>

            {address ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-muted-foreground font-medium">Balance</p>
                  <p className="text-sm font-bold text-primary">{balance} ETH</p>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="bg-secondary text-foreground px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-muted"
                >
                  {address.slice(0, 6)}...{address.slice(-4)}
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 shadow-lg shadow-primary/20"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          {loading && coins.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
  <div className="bg-card p-6 rounded-xl border border-border flex items-center justify-between">
    <div>
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
    <div className={cn("p-3 rounded-lg bg-secondary", color)}>
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
