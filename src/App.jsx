import { useEffect, useCallback, useMemo, useState } from 'react'
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
    loading,
    setLoading,
    setError,
    filters,
    searchQuery,
    sort,
    wallet,
    connectWallet,
    disconnectWallet
  } = useCoinStore()

  // State for dashboard specific data to avoid filter interference
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

      // Apply client-side filters
      let filteredData = data

      // 1. Network Filter (if searching, API results might include other chains)
      if (filters.network !== 'all') {
        const mappedChainId = getMappedChainId(filters.network);
        filteredData = filteredData.filter(p => p.chainId === mappedChainId)
      }

      // 2. DEX Filter
      if (filters.dex !== 'all') {
        filteredData = filteredData.filter(p =>
          p.dexId?.toLowerCase().includes(filters.dex.toLowerCase())
        )
      }

      // 3. Age Filter
      if (filters.age !== 'all') {
        const now = Date.now()
        const maxAgeHours = filters.age === '1h' ? 1 :
                           filters.age === '6h' ? 6 :
                           filters.age === '24h' ? 24 : 168 // 7d
        filteredData = filteredData.filter(p => {
          if (!p.pairCreatedAt) return false
          return (now - p.pairCreatedAt) / 1000 / 60 / 60 <= maxAgeHours
        })
      }

      // 4. Market Cap Filter
      if (filters.marketCap !== 'all') {
        filteredData = filteredData.filter(p => {
          const mcap = p.fdv || 0
          if (filters.marketCap === 'micro') return mcap < 100000
          if (filters.marketCap === 'small') return mcap >= 100000 && mcap < 1000000
          if (filters.marketCap === 'mid') return mcap >= 1000000 && mcap < 10000000
          if (filters.marketCap === 'large') return mcap >= 10000000
          return true
        })
      }

      // 5. Liquidity Filter
      if (filters.liquidity !== 'all') {
        const minLiq = filters.liquidity === '10k' ? 10000 :
                       filters.liquidity === '100k' ? 100000 : 1000000
        filteredData = filteredData.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
      }

      // 6. Volume Filter
      if (filters.volume !== 'all') {
        filteredData = filteredData.filter(p => {
          if (filters.volume === '1h_1k') return (p.volume?.h1 || 0) >= 1000
          if (filters.volume === '24h_10k') return (p.volume?.h24 || 0) >= 10000
          if (filters.volume === '24h_100k') return (p.volume?.h24 || 0) >= 100000
          return true
        })
      }

      // 7. Verified Filter (heuristic: has website or socials)
      if (filters.verified) {
        filteredData = filteredData.filter(p =>
          p.info?.websites?.length > 0 || p.info?.socials?.length > 0
        )
      }

      // 8. Sorting
      filteredData.sort((a, b) => {
        if (sort === 'marketCap') return (b.fdv || 0) - (a.fdv || 0)
        if (sort === 'volume') return (b.volume?.h24 || 0) - (a.volume?.h24 || 0)
        if (sort === 'age') return (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0)
        // Default: Trending
        return calculateTrendingScore(b) - calculateTrendingScore(a)
      })

      setCoins(filteredData)

      // If we're on dashboard, we also want unfiltered trending data for the main table
      if (view === 'dashboard') {
        const trendingData = await coinService.getTrending()
        trendingData.sort((a, b) => calculateTrendingScore(b) - calculateTrendingScore(a))
        setDashboardCoins(trendingData)
      }
    } catch (err) {
      setError('Failed to fetch data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filters, searchQuery, sort, setCoins, setError, setLoading, view])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Dashboard Stats (use filtered coins to reflect current market discovery based on user preferences)
  const stats = useMemo(() => {
    const dataSource = view === 'dashboard' ? dashboardCoins : coins
    return {
      trending: dataSource.length,
      new24h: dataSource.filter(c => {
        if (!c.pairCreatedAt) return false
        return (Date.now() - c.pairCreatedAt) / 1000 / 60 / 60 <= 24
      }).length,
      safe: dataSource.length > 0
        ? Math.round((dataSource.filter(c => c.info?.websites?.length > 0).length / dataSource.length) * 100)
        : 0,
      highVol: dataSource.filter(c => (c.volume?.h24 || 0) > 100000).length
    }
  }, [coins, dashboardCoins, view])

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Global Trending" value={stats.trending.toString()} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New 24h" value={stats.new24h.toString()} icon={Zap} color="text-yellow-500" />
              <StatCard title="Safe / Verified" value={`${stats.safe}%`} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="High Volume" value={stats.highVol.toString()} icon={Activity} color="text-red-500" />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                <h2 className="text-lg font-bold">Top Trending Pairs (Global)</h2>
                <button className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors font-semibold" onClick={() => fetchData()}>
                  Refresh Data
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
              <CoinsTable data={coins} />
            </div>
          </div>
        )
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
            <div className="p-4 rounded-full bg-secondary">
              <Activity size={48} className="animate-pulse text-primary/40" />
            </div>
            <div className="text-center">
               <h3 className="text-lg font-bold text-foreground capitalize">{view.replace('-', ' ')}</h3>
               <p className="text-sm italic">This module is currently being indexed...</p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-card/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
             <h2 className="text-xl font-bold capitalize tracking-tight">{view.replace('-', ' ')}</h2>
             <div className="flex items-center gap-2 px-2.5 py-0.5 bg-green-500/10 text-green-500 rounded-full text-[10px] font-bold border border-green-500/20">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
                NETWORK LIVE
              </div>
          </div>
          <div className="flex items-center gap-4">
            {wallet.isConnected ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Balance</p>
                  <p className="text-sm font-bold">{wallet.balance} ETH</p>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="bg-secondary text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted border border-border flex items-center gap-2"
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
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
        <div className="flex-1 overflow-auto bg-secondary/20">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-primary/10 animate-pulse"></div>
                </div>
              </div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Scanning Blockchain...</p>
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
  <div className="bg-card p-6 rounded-xl border border-border flex items-center justify-between hover:border-primary/30 transition-colors group cursor-default">
    <div>
      <p className="text-xs text-muted-foreground mb-1 font-bold uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
    <div className={cn("p-3 rounded-xl bg-secondary group-hover:scale-110 transition-transform", color)}>
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
