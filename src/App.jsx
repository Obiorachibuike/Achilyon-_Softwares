import { useEffect, useCallback, useMemo, useState } from 'react'
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

      const processedData = data.map(p => ({
        ...p,
        trendingScore: calculateTrendingScore(p)
      }))

      setCoins(processedData)
      if (isInitial) {
        setDashboardCoins(processedData)
      }
    } catch (err) {
      setError('Failed to fetch data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filters.network, filters.searchQuery, setCoins, setError, setLoading])

  useEffect(() => {
    fetchData(view === 'dashboard')
  }, [filters.network, filters.searchQuery, fetchData, view])

  const filteredCoins = useMemo(() => {
    let result = [...coins]

    // Network Filter (Secondary check in case search is broad)
    if (filters.network !== 'all') {
       const mappedNetwork = filters.network === 'bnb' ? 'bsc' : filters.network;
       result = result.filter(p => p.chainId === mappedNetwork)
    }

    // Age Filter
    if (filters.age !== 'all') {
      const now = Date.now()
      const maxAgeMs = filters.age === '< 1h' ? 3600000 :
                       filters.age === '< 6h' ? 21600000 :
                       filters.age === '< 24h' ? 86400000 :
                       filters.age === '< 7d' ? 604800000 : Infinity
      result = result.filter(p => p.pairCreatedAt && (now - p.pairCreatedAt) <= maxAgeMs)
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
        const fdv = p.fdv || 0
        if (filters.marketCap === 'micro') return fdv < 1000000
        if (filters.marketCap === 'small') return fdv >= 1000000 && fdv < 10000000
        if (filters.marketCap === 'mid') return fdv >= 10000000 && fdv < 100000000
        if (filters.marketCap === 'large') return fdv >= 100000000
        return true
      })
    }

    // Verified Filter (Mock logic: has at least one social/website)
    if (filters.verified) {
      result = result.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0)
    }

    // Sort
    result.sort((a, b) => {
      if (filters.sort === 'trending') return (b.trendingScore || 0) - (a.trendingScore || 0)
      if (filters.sort === 'mcap') return (b.fdv || 0) - (a.fdv || 0)
      if (filters.sort === 'volume') return (b.volume?.h24 || 0) - (a.volume?.h24 || 0)
      if (filters.sort === 'age') return (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0)
      return 0
    })

    return result
  }, [coins, filters])

  const stats = useMemo(() => {
    const trending = dashboardCoins.filter(p => (p.trendingScore || 0) >= 60).length
    const new24h = dashboardCoins.filter(p => (Date.now() - (p.pairCreatedAt || 0)) <= 86400000).length
    const verified = dashboardCoins.length > 0 ? Math.round((dashboardCoins.filter(p => p.info?.websites?.length > 0).length / dashboardCoins.length) * 100) : 0

    return { trending, new24h, verified }
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
              <StatCard title="Verified" value={`${stats.verified}%`} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Discovery" value={dashboardCoins.length.toString()} icon={Activity} color="text-red-500" />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h2 className="text-lg font-bold">Hot Opportunities</h2>
                <button className="text-sm text-primary hover:underline" onClick={() => fetchData(true)}>Refresh</button>
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
              <CoinsTable data={filteredCoins} />
            </div>
          </div>
        )
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground italic space-y-4">
             <div className="p-6 bg-secondary/50 rounded-full">
                <Zap size={48} className="text-muted-foreground/20" />
             </div>
             <p className="text-lg font-medium">{formattedView.charAt(0).toUpperCase() + formattedView.slice(1)} view is under development...</p>
          </div>
        )
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center space-x-2">
             <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center">
                <Activity size={18} className="text-primary" />
             </div>
             <h2 className="text-xl font-bold capitalize">{view.replace('-', ' ')}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold border border-primary/20">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              LIVE FEED
            </div>
            {address ? (
               <div className="flex items-center gap-3 bg-secondary px-3 py-1.5 rounded-lg border border-border">
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground leading-none mb-1 uppercase font-bold">Balance</p>
                    <p className="text-xs font-bold leading-none">{balance} ETH</p>
                  </div>
                  <div className="w-[1px] h-6 bg-border mx-1"></div>
                  <button
                    onClick={disconnectWallet}
                    className="text-xs font-mono hover:text-primary transition-colors"
                  >
                    {address}
                  </button>
               </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          {loading && coins.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground animate-pulse">Scanning the blockchain...</p>
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
  <div className="bg-card p-6 rounded-xl border border-border flex items-center justify-between hover:border-primary/30 transition-colors group">
    <div>
      <p className="text-sm text-muted-foreground mb-1 group-hover:text-foreground transition-colors">{title}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
    <div className={cn("p-4 rounded-xl bg-secondary/50 group-hover:bg-secondary transition-colors", color)}>
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
