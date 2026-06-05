import { useEffect, useCallback, useMemo } from 'react'
import Sidebar from './components/Sidebar'
import FiltersBar from './components/FiltersBar'
import CoinsTable from './components/CoinsTable'
import useCoinStore from './store/useCoinStore'
import { coinService } from './services/api'
import { calculateTrendingScore } from './lib/trending'
import { TrendingUp, Activity, ShieldCheck, Zap, Wallet as WalletIcon } from 'lucide-react'
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
    balance,
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

      // Client-side filtering
      let filteredData = data

      // 1. Secondary Network Filter (for search results)
      if (filters.network !== 'all') {
        filteredData = filteredData.filter(p => p.chainId === filters.network)
      }

      // 2. DEX Filter
      if (filters.dex !== 'all') {
        filteredData = filteredData.filter(p => p.dexId?.toLowerCase() === filters.dex)
      }

      // 3. Age Filter
      if (filters.age !== 'all') {
        const now = Date.now()
        const maxAgeMs = filters.age === '1h' ? 3600000 :
                         filters.age === '6h' ? 21600000 :
                         filters.age === '24h' ? 86400000 : 604800000 // 7d

        filteredData = filteredData.filter(p => p.pairCreatedAt && (now - p.pairCreatedAt) <= maxAgeMs)
      }

      // 4. Liquidity Filter
      if (filters.liquidity !== 'all') {
        const minLiq = filters.liquidity === '10k' ? 10000 :
                       filters.liquidity === '100k' ? 100000 : 1000000
        filteredData = filteredData.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
      }

      // 5. Market Cap Filter
      if (filters.marketCap !== 'all') {
        filteredData = filteredData.filter(p => {
          const mcap = p.fdv || 0
          if (filters.marketCap === 'micro') return mcap < 1000000
          if (filters.marketCap === 'small') return mcap < 10000000
          if (filters.marketCap === 'mid') return mcap < 100000000
          if (filters.marketCap === 'large') return mcap >= 100000000
          return true
        })
      }

      // 6. Volume Filter
      if (filters.volume !== 'all') {
        const minVol = filters.volume === '10k' ? 10000 :
                       filters.volume === '100k' ? 100000 : 1000000
        filteredData = filteredData.filter(p => parseFloat(p.volume?.h24 || 0) >= minVol)
      }

      // 7. Verified Filter (heuristic: has website or socials)
      if (filters.verified) {
        filteredData = filteredData.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0)
      }

      // 8. Global Sort
      filteredData.sort((a, b) => {
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

      setCoins(filteredData)
    } catch (err) {
      setError('Failed to fetch data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filters, setCoins, setError, setLoading])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const stats = useMemo(() => {
    const trendingCount = coins.filter(c => (c.volume?.h1 / (c.volume?.h24 / 24 || 1)) > 2).length
    const newListings = coins.filter(c => (Date.now() - c.pairCreatedAt) < 86400000).length
    const safePairs = coins.length > 0 ? Math.round((coins.filter(c => c.info?.websites?.length > 0).length / coins.length) * 100) : 0

    return {
      trending: trendingCount,
      new: newListings,
      safe: safePairs,
      volatility: 'Medium'
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
              <StatCard title="Verified Tokens" value={`${stats.safe}%`} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Market Volatility" value={stats.volatility} icon={Activity} color="text-red-500" />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h2 className="text-lg font-bold">Top Discovery Pairs</h2>
                <button className="text-sm text-primary hover:underline" onClick={() => fetchData()}>Refresh</button>
              </div>
              <CoinsTable data={coins.slice(0, 10)} />
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
      case 'wallets':
        return (
          <div className="p-12 flex flex-col items-center justify-center space-y-6">
            <div className="p-6 bg-secondary rounded-full">
               <WalletIcon size={48} className="text-primary" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Portfolio Tracking</h2>
              <p className="text-muted-foreground max-w-md">
                Monitor your assets, track whale wallets, and analyze performance across all supported chains.
              </p>
            </div>
            {!address ? (
               <button
                onClick={connectWallet}
                className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:opacity-90 shadow-lg shadow-primary/20 transition-all"
               >
                 Connect to Get Started
               </button>
            ) : (
              <div className="bg-card border border-border p-6 rounded-2xl w-full max-w-md space-y-4">
                 <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground font-medium">Balance</span>
                    <span className="text-xl font-bold">{balance} ETH</span>
                 </div>
                 <div className="p-3 bg-secondary rounded-lg font-mono text-xs break-all">
                    {address}
                 </div>
                 <button
                  onClick={disconnectWallet}
                  className="w-full py-2 text-sm font-medium text-red-500 hover:bg-red-500/5 rounded-lg transition-colors"
                 >
                   Disconnect
                 </button>
              </div>
            )}
          </div>
        )
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
            <div className="p-4 bg-muted rounded-full">
               <Activity size={32} />
            </div>
            <div className="text-center">
               <h3 className="text-lg font-medium text-foreground capitalize">{view.replace('-', ' ')}</h3>
               <p className="text-sm italic">Intelligence layer for {view} is currently being indexed...</p>
            </div>
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
             <h2 className="text-xl font-bold capitalize">{view.replace('-', ' ')}</h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-tighter">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
              Live Data Feed
            </div>

            {address ? (
               <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                     <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Balance</p>
                     <p className="text-sm font-black">{balance} ETH</p>
                  </div>
                  <button
                    onClick={disconnectWallet}
                    className="bg-secondary border border-border px-4 py-2 rounded-lg text-xs font-bold hover:bg-muted transition-colors"
                  >
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </button>
               </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-all active:scale-95"
              >
                Connect
              </button>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          {loading && coins.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground font-medium animate-pulse">Indexing blockchain data...</p>
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
      <p className="text-sm text-muted-foreground mb-1 font-medium">{title}</p>
      <p className="text-2xl font-black tracking-tight">{value}</p>
    </div>
    <div className={cn("p-3 rounded-xl bg-secondary group-hover:bg-primary/5 transition-colors", color)}>
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
