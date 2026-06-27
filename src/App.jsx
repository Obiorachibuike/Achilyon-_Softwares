import { useEffect, useCallback, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar'
import FiltersBar from './components/FiltersBar'
import CoinsTable from './components/CoinsTable'
import AISummary from './components/AISummary'
import useCoinStore from './store/useCoinStore'
import { coinService } from './services/api'
import { TrendingUp, Activity, ShieldCheck, Zap, Wallet } from 'lucide-react'
import { cn } from './lib/utils'
import { calculateTrendScore } from './lib/trending'
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
    isWalletConnected,
    walletAddress,
    balance,
    connectWallet,
    disconnectWallet
  } = useCoinStore()

  const [dashboardCoins, setDashboardCoins] = useState([])

  const fetchData = useCallback(async (isInitial = false) => {
    setLoading(true)
    try {
      let data = []
      if (filters.network !== 'all') {
        data = await coinService.getPairsByChain(filters.network)
      } else if (filters.searchQuery) {
        data = await coinService.searchPairs(filters.searchQuery)
      } else {
        data = await coinService.getTrending()
      }

      setCoins(data)
      if (isInitial) {
        setDashboardCoins(data)
      }
    } catch (err) {
      setError('Failed to fetch data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filters.network, filters.searchQuery, setCoins, setError, setLoading])

  useEffect(() => {
    fetchData(view === 'dashboard' && dashboardCoins.length === 0)
  }, [filters.network, filters.searchQuery, fetchData, view, dashboardCoins.length])

  // Client-side filtering & sorting
  const filteredCoins = useMemo(() => {
    let result = [...coins]

    // Market Cap
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

    // Liquidity
    if (filters.liquidity !== 'all') {
      const minLiq = filters.liquidity.includes('10k') ? 10000 :
                     filters.liquidity.includes('100k') ? 100000 : 1000000
      result = result.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
    }

    // Volume
    if (filters.volume !== 'all') {
       const minVol = filters.volume.includes('10k') ? 10000 :
                      filters.volume.includes('100k') ? 100000 : 1000000
       result = result.filter(p => parseFloat(p.volume?.h24 || 0) >= minVol)
    }

    // Age
    if (filters.age !== 'all') {
       const now = Date.now()
       const hours = filters.age === '1h' ? 1 : filters.age === '6h' ? 6 : filters.age === '24h' ? 24 : 168
       result = result.filter(p => p.pairCreatedAt && (now - p.pairCreatedAt) < hours * 60 * 60 * 1000)
    }

    // DEX
    if (filters.dex !== 'all') {
      result = result.filter(p => p.dexId?.toLowerCase() === filters.dex.toLowerCase())
    }

    // Verified
    if (filters.verified) {
      result = result.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0)
    }

    // Sort by Trend Score by default
    return result.sort((a, b) => calculateTrendScore(b) - calculateTrendScore(a))
  }, [coins, filters])

  // Dashboard Stats
  const stats = useMemo(() => {
    const activeData = dashboardCoins.length > 0 ? dashboardCoins : coins
    return {
      trending: activeData.filter(p => calculateTrendScore(p) >= 60).length,
      newListings: activeData.filter(p => {
        const age = (Date.now() - (p.pairCreatedAt || 0)) / 1000 / 60 / 60
        return age < 24
      }).length,
      safePairs: activeData.filter(p => p.info?.websites?.length > 0).length,
      totalVolume: activeData.reduce((acc, p) => acc + (p.volume?.h24 || 0), 0)
    }
  }, [coins, dashboardCoins])

  const renderContent = () => {
    const formattedView = view.replace('-', ' ')
    switch (view) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Trending Pairs" value={stats.trending.toString()} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New 24h" value={stats.newListings.toString()} icon={Zap} color="text-yellow-500" />
              <StatCard title="Safe/Verified" value={stats.safePairs.toString()} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Active Liquidity" value={`$${(stats.totalVolume / 10).toLocaleString(undefined, {maximumFractionDigits: 0})}`} icon={Activity} color="text-red-500" />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
                <h2 className="text-lg font-bold flex items-center gap-2">
                   <TrendingUp className="w-5 h-5 text-primary" />
                   Global Market Discovery
                </h2>
                <button className="text-xs bg-secondary hover:bg-muted px-3 py-1.5 rounded-lg border border-border transition-colors font-medium" onClick={() => fetchData(true)}>Refresh Data</button>
              </div>
              <CoinsTable data={dashboardCoins.slice(0, 15)} />
            </div>
          </div>
        )
      case 'coins':
      case 'trending':
        return (
          <div className="flex flex-col h-full">
            <FiltersBar />
            <div className="p-4 bg-muted/10 border-b border-border">
               <AISummary coins={filteredCoins.slice(0, 3)} />
            </div>
            <div className="flex-1 overflow-auto bg-card">
              <CoinsTable data={filteredCoins} />
            </div>
          </div>
        )
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
               <Activity className="w-8 h-8 animate-pulse" />
            </div>
            <h3 className="text-lg font-medium text-foreground capitalize">{formattedView} view is coming soon</h3>
            <p className="text-sm">We are currently indexing real-time data for this section.</p>
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
             <h2 className="text-xl font-black tracking-tight uppercase italic">{view.replace('-', ' ')}</h2>
             <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-bold border border-green-500/20">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              NETWORK LIVE
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isWalletConnected ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-foreground">{walletAddress}</div>
                  <div className="text-[10px] text-muted-foreground font-medium">{balance} ETH</div>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="bg-secondary hover:bg-muted text-foreground p-2 rounded-lg border border-border"
                >
                  <Wallet size={18} />
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
              >
                <Wallet size={18} />
                Connect Terminal
              </button>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-hidden">
          {loading && coins.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-2 h-2 bg-primary rounded-full animate-ping"></div>
                </div>
              </div>
              <p className="text-sm font-medium animate-pulse">Scanning Chains...</p>
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
  <div className="bg-card p-6 rounded-xl border border-border flex items-center justify-between hover:border-primary/50 transition-colors cursor-default group">
    <div>
      <p className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">{title}</p>
      <p className="text-3xl font-black">{value}</p>
    </div>
    <div className={cn("p-4 rounded-xl bg-secondary group-hover:scale-110 transition-transform", color)}>
      <Icon size={24} strokeWidth={2.5} />
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
