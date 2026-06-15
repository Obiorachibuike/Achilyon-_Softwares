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
  const { view, coins, setCoins, loading, setLoading, setError, filters, wallet, connectWallet } = useCoinStore()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let data = []
      const { network, searchQuery } = filters

      if (searchQuery) {
        data = await coinService.searchPairs(searchQuery)
      } else if (network !== 'all') {
        // DexScreener uses 'bsc' for bnb
        const chainParam = network === 'bnb' ? 'bsc' : network
        data = await coinService.getPairsByChain(chainParam)
      } else {
        data = await coinService.getTrending()
      }

      // Apply client-side filters for refined discovery
      let filteredData = [...data]

      // Strict network filter when not in 'all' or when searching
      if (network !== 'all') {
         const chainParam = network === 'bnb' ? 'bsc' : network
         filteredData = filteredData.filter(p => p.chainId === chainParam)
      }

      // DEX filter
      if (filters.dex !== 'all') {
        filteredData = filteredData.filter(p => p.dexId?.toLowerCase().includes(filters.dex))
      }

      // Age filter
      if (filters.age !== 'all') {
        const now = Date.now()
        const hoursMap = { '1h': 1, '6h': 6, '24h': 24, '7d': 168 }
        const maxHours = hoursMap[filters.age]
        filteredData = filteredData.filter(p => {
          if (!p.pairCreatedAt) return false
          const ageHours = (now - p.pairCreatedAt) / 1000 / 60 / 60
          return ageHours <= maxHours
        })
      }

      // Liquidity filter
      if (filters.liquidity !== 'all') {
        const minLiq = filters.liquidity === '10k' ? 10000 :
                       filters.liquidity === '100k' ? 100000 : 1000000
        filteredData = filteredData.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
      }

      // Volume filter
      if (filters.volume !== 'all') {
        const minVol = filters.volume === '50k' ? 50000 :
                       filters.volume === '250k' ? 250000 : 1000000
        filteredData = filteredData.filter(p => parseFloat(p.volume?.h24 || 0) >= minVol)
      }

      // Market Cap filter
      if (filters.marketCap !== 'all') {
        filteredData = filteredData.filter(p => {
          const mcap = parseFloat(p.fdv || 0)
          if (filters.marketCap === 'micro') return mcap < 1000000
          if (filters.marketCap === 'small') return mcap >= 1000000 && mcap < 10000000
          if (filters.marketCap === 'mid') return mcap >= 10000000 && mcap < 100000000
          if (filters.marketCap === 'large') return mcap >= 100000000
          return true
        })
      }

      // Verified filter (Heuristic: has links)
      if (filters.verifiedOnly) {
        filteredData = filteredData.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0)
      }

      // Sorting
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

  // Dynamic Stats for Dashboard
  const stats = useMemo(() => {
    const trendingCount = coins.filter(p => calculateTrendingScore(p) > 50).length
    const newCount = coins.filter(p => (Date.now() - p.pairCreatedAt) / 1000 / 60 / 60 < 24).length
    const safeCount = coins.filter(p => p.info?.websites?.length > 0).length
    const safePercent = coins.length > 0 ? Math.round((safeCount / coins.length) * 100) : 0

    return {
      trending: trendingCount,
      new: newCount,
      safe: `${safePercent}%`,
      volatility: coins.length > 50 ? 'High' : 'Moderate'
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
              <StatCard title="Verified Tokens" value={stats.safe} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Market Sentiment" value={stats.volatility} icon={Activity} color="text-red-500" />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h2 className="text-lg font-bold">Top Market Pairs</h2>
                <button
                  className="text-sm font-medium text-primary hover:bg-primary/10 px-3 py-1 rounded-md transition-colors"
                  onClick={() => fetchData()}
                >
                  Refresh
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
            <div className="flex-1 overflow-auto bg-card">
              <CoinsTable data={coins} />
            </div>
          </div>
        )
      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground italic">
            {view.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} view is under development...
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
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold border border-primary/20">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              LIVE DATA
            </div>

            {wallet.connected ? (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Balance</p>
                  <p className="text-sm font-mono font-bold text-primary">{wallet.balance} ETH</p>
                </div>
                <div className="bg-secondary px-4 py-2 rounded-lg border border-border">
                  <p className="text-xs font-mono text-foreground">
                    {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                  </p>
                </div>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground animate-pulse font-medium">Indexing Blockchain Data...</p>
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
  <div className="bg-card p-6 rounded-xl border border-border flex items-center justify-between hover:border-primary/50 transition-colors group">
    <div>
      <p className="text-sm text-muted-foreground mb-1 font-medium">{title}</p>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
    </div>
    <div className={cn("p-4 rounded-xl bg-secondary transition-transform group-hover:scale-110", color)}>
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
