import { useEffect, useCallback, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar'
import FiltersBar from './components/FiltersBar'
import CoinsTable from './components/CoinsTable'
import useCoinStore from './store/useCoinStore'
import { coinService } from './services/api'
import { TrendingUp, Activity, ShieldCheck, Zap } from 'lucide-react'
import { cn, getMappedChainId } from './lib/utils'
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

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let data = []
      if (filters.network !== 'all') {
        data = await coinService.getPairsByChain(filters.network)
      } else {
        data = await coinService.getTrending()
      }

      // Apply client-side filters
      let filteredData = data

      // Network Filter (Secondary check to ensure strictness if API search is broad)
      if (filters.network !== 'all') {
        const mappedChainId = getMappedChainId(filters.network)
        filteredData = filteredData.filter(p => p.chainId === mappedChainId)
      }

      // Search Query
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase()
        filteredData = filteredData.filter(p =>
          p.baseToken.name.toLowerCase().includes(q) ||
          p.baseToken.symbol.toLowerCase().includes(q) ||
          p.pairAddress.toLowerCase().includes(q) ||
          p.baseToken.address.toLowerCase().includes(q)
        )
      }

      // Age Filter
      if (filters.age !== 'all') {
        const now = Date.now()
        const maxAgeMs = {
          '1h': 3600000,
          '6h': 21600000,
          '24h': 86400000,
          '7d': 604800000
        }[filters.age]
        filteredData = filteredData.filter(p => p.pairCreatedAt && (now - p.pairCreatedAt) <= maxAgeMs)
      }

      // Liquidity Filter
      if (filters.liquidity !== 'all') {
        const minLiq = { '10k': 10000, '100k': 100000, '1m': 1000000 }[filters.liquidity]
        filteredData = filteredData.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
      }

      // Volume Filter
      if (filters.volume !== 'all') {
        const minVol = { '1k': 1000, '10k': 10000, '100k': 100000, '1m': 1000000 }[filters.volume]
        filteredData = filteredData.filter(p => parseFloat(p.volume?.h24 || 0) >= minVol)
      }

      // Market Cap Filter
      if (filters.marketCap !== 'all') {
        filteredData = filteredData.filter(p => {
          const mcap = parseFloat(p.fdv || 0)
          switch (filters.marketCap) {
            case 'micro': return mcap < 1000000
            case 'small': return mcap >= 1000000 && mcap < 10000000
            case 'mid': return mcap >= 10000000 && mcap < 100000000
            case 'large': return mcap >= 100000000
            default: return true
          }
        })
      }

      // Verified Filter (Mock heuristic: has at least one social/website link)
      if (filters.verified) {
        filteredData = filteredData.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0)
      }

      setCoins(filteredData)

      // Update dashboard specific coins (always trending regardless of filters) if in dashboard view
      if (view === 'dashboard') {
        setDashboardCoins(data.slice(0, 10))
      }
    } catch (err) {
      setError('Failed to fetch data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filters, setCoins, setError, setLoading, view])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Derive dashboard stats from current coin list
  const stats = useMemo(() => {
    const trendingCount = coins.filter(p => p.volume?.h1 > (p.volume?.h24 / 24) * 2).length
    const newCount = coins.filter(p => p.pairCreatedAt && (Date.now() - p.pairCreatedAt) < 86400000).length
    const safeCount = coins.length > 0 ? Math.round((coins.filter(p => p.info?.websites?.length > 0).length / coins.length) * 100) : 0

    return {
      trending: trendingCount,
      new: newCount,
      safe: safeCount + '%',
      volatility: coins.length > 50 ? 'High' : 'Medium'
    }
  }, [coins])

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Trending Pairs" value={stats.trending.toString()} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New 24h" value={stats.new.toString()} icon={Zap} color="text-yellow-500" />
              <StatCard title="Safe/Verified" value={stats.safe} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Market Volatility" value={stats.volatility} icon={Activity} color="text-red-500" />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-lg">
              <div className="p-5 border-b border-border flex justify-between items-center bg-muted/30">
                <div className="flex items-center gap-2">
                   <TrendingUp size={20} className="text-primary" />
                   <h2 className="text-lg font-bold">Global Trending Pairs</h2>
                </div>
                <button className="text-sm text-primary font-medium hover:underline flex items-center gap-1" onClick={() => fetchData()}>
                  Refresh Data
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
              <CoinsTable data={coins} />
            </div>
          </div>
        )
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
            <div className="p-4 bg-secondary rounded-full">
              <Activity size={48} className="animate-pulse" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-foreground capitalize">{view.replace('-', ' ')}</h3>
              <p className="italic">This feature is currently being indexed...</p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-card/50 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4">
             <h2 className="text-xl font-black uppercase tracking-tighter text-primary">{view.replace('-', ' ')}</h2>
             <div className="h-4 w-[1px] bg-border mx-2"></div>
             <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black tracking-widest border border-green-500/20">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              LIVE FEED
            </div>
          </div>

          <div className="flex items-center gap-6">
            {address ? (
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Portfolio</p>
                  <p className="text-sm font-mono font-bold text-primary">{balance} ETH</p>
                </div>
                <div
                  onClick={disconnectWallet}
                  className="bg-secondary border border-border px-4 py-2 rounded-lg text-xs font-mono font-bold cursor-pointer hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500 transition-all"
                >
                  {address.slice(0, 6)}...{address.slice(-4)}
                </div>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto relative">
          {loading && coins.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-50">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <p className="text-sm font-bold animate-pulse text-primary tracking-widest uppercase">Fetching Market Data...</p>
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
  <div className="bg-card p-6 rounded-xl border border-border flex items-center justify-between shadow-sm hover:shadow-md transition-shadow group">
    <div>
      <p className="text-xs text-muted-foreground mb-1 font-bold uppercase tracking-wider group-hover:text-primary transition-colors">{title}</p>
      <p className="text-3xl font-black tracking-tight">{value}</p>
    </div>
    <div className={cn("p-4 rounded-2xl bg-secondary group-hover:scale-110 transition-transform", color)}>
      <Icon size={28} />
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
