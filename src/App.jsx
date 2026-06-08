import { useEffect, useCallback, useMemo } from 'react'
import Sidebar from './components/Sidebar'
import FiltersBar from './components/FiltersBar'
import CoinsTable from './components/CoinsTable'
import useCoinStore from './store/useCoinStore'
import { coinService } from './services/api'
import { TrendingUp, Activity, ShieldCheck, Zap, RefreshCw } from 'lucide-react'
import { cn } from './lib/utils'
import PropTypes from 'prop-types'

const App = () => {
  const { view, coins, setCoins, loading, setLoading, setError, filters, address, balance, connectWallet } = useCoinStore()

  const stats = useMemo(() => {
    const trending = coins.length
    const news = coins.filter(p => {
      if (!p.pairCreatedAt) return false
      return (Date.now() - p.pairCreatedAt) / 1000 / 60 / 60 < 24
    }).length
    const safe = coins.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0).length
    const safePercent = trending > 0 ? Math.round((safe / trending) * 100) : 0

    return { trending, news, safePercent }
  }, [coins])

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

      // Apply client-side filters
      let filteredData = data

      // Network Filter (Secondary check for search results)
      if (filters.network !== 'all') {
        filteredData = filteredData.filter(p => p.chainId === filters.network)
      }

      // DEX Filter
      if (filters.dex !== 'all') {
        filteredData = filteredData.filter(p => p.dexId?.toLowerCase().includes(filters.dex))
      }

      // Liquidity Filter
      if (filters.liquidity !== 'all') {
        const minLiq = filters.liquidity.includes('10k') ? 10000 :
                       filters.liquidity.includes('100k') ? 100000 : 1000000
        filteredData = filteredData.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
      }

      // Market Cap Filter
      if (filters.marketCap !== 'all') {
        const caps = {
          'micro-cap': [0, 500000],
          'small-cap': [500000, 5000000],
          'mid-cap': [5000000, 50000000],
          'large-cap': [50000000, Infinity]
        }
        const [min, max] = caps[filters.marketCap] || [0, Infinity]
        filteredData = filteredData.filter(p => {
          const fdv = parseFloat(p.fdv || 0)
          return fdv >= min && fdv < max
        })
      }

      // Volume Filter
      if (filters.volume !== 'all') {
        const minVol = filters.volume.includes('50k') ? 50000 :
                       filters.volume.includes('500k') ? 500000 : 5000000
        filteredData = filteredData.filter(p => parseFloat(p.volume?.h24 || 0) >= minVol)
      }

      // Age Filter
      if (filters.age !== 'all') {
        const maxAgeHours = filters.age.includes('1h') ? 1 :
                            filters.age.includes('6h') ? 6 :
                            filters.age.includes('24h') ? 24 : 168
        filteredData = filteredData.filter(p => {
          if (!p.pairCreatedAt) return false
          const ageHours = (Date.now() - p.pairCreatedAt) / 1000 / 60 / 60
          return ageHours <= maxAgeHours
        })
      } else {
        // When 'all' is selected, we might still want to show everything regardless of pairCreatedAt
        // But the previous implementation set '24h' as default.
      }

      // Verified Filter
      if (filters.verified) {
        filteredData = filteredData.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0)
      }

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

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Trending Pairs" value={stats.trending.toString()} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New 24h" value={stats.news.toString()} icon={Zap} color="text-yellow-500" />
              <StatCard title="Verified" value={`${stats.safePercent}%`} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Discovering" value="Live" icon={Activity} color="text-red-500" />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h2 className="text-lg font-bold">Market Discovery</h2>
                <button
                  className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-primary"
                  onClick={() => fetchData()}
                  title="Refresh Data"
                >
                  <RefreshCw size={18} />
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
             <h2 className="text-xl font-bold capitalize">{view}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              LIVE
            </div>
            {address ? (
              <div className="flex items-center gap-3 bg-secondary px-4 py-2 rounded-lg border border-border">
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase leading-none mb-1">Balance</p>
                  <p className="text-sm font-bold leading-none">{balance} ETH</p>
                </div>
                <div className="w-px h-6 bg-border"></div>
                <p className="text-sm font-medium font-mono">{address}</p>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          {loading ? (
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
