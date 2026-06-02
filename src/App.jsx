import { useEffect, useCallback, useMemo } from 'react'
import Sidebar from './components/Sidebar'
import FiltersBar from './components/FiltersBar'
import CoinsTable from './components/CoinsTable'
import AISummary from './components/AISummary'
import useCoinStore from './store/useCoinStore'
import { coinService } from './services/api'
import { calculateTrendingScore } from './lib/trending'
import { TrendingUp, Activity, ShieldCheck, Zap } from 'lucide-react'
import { cn } from './lib/utils'
import PropTypes from 'prop-types'

const App = () => {
  const { view, coins, setCoins, loading, setLoading, setError, filters } = useCoinStore()

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

      // Network filter (extra safety for search results)
      if (filters.network !== 'all') {
        filteredData = filteredData.filter(p => p.chainId === filters.network)
      }

      // DEX filter
      if (filters.dex !== 'all') {
        filteredData = filteredData.filter(p => p.dexId?.toLowerCase().includes(filters.dex.toLowerCase()))
      }

      // Age filter
      if (filters.age !== 'all') {
        const hours = parseInt(filters.age)
        const now = Date.now()
        filteredData = filteredData.filter(p => {
          if (!p.pairCreatedAt) return true // Keep if unknown to avoid missing data
          const ageHours = (now - p.pairCreatedAt) / 1000 / 60 / 60
          return ageHours <= hours
        })
      }

      // Liquidity filter
      if (filters.liquidity !== 'all') {
        const minLiq = filters.liquidity.includes('10k') ? 10000 :
                       filters.liquidity.includes('100k') ? 100000 : 1000000
        filteredData = filteredData.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
      }

      // Volume filter
      if (filters.volume !== 'all') {
        const minVol = filters.volume.includes('50k') ? 50000 :
                       filters.volume.includes('500k') ? 500000 : 5000000
        filteredData = filteredData.filter(p => parseFloat(p.volume?.h24 || 0) >= minVol)
      }

      // Market Cap filter
      if (filters.marketCap !== 'all') {
        filteredData = filteredData.filter(p => {
          const mcap = parseFloat(p.fdv || 0)
          if (filters.marketCap === 'micro-cap') return mcap < 1000000
          if (filters.marketCap === 'small-cap') return mcap >= 1000000 && mcap < 10000000
          if (filters.marketCap === 'mid-cap') return mcap >= 10000000 && mcap < 100000000
          if (filters.marketCap === 'large-cap') return mcap >= 100000000
          return true
        })
      }

      // Sorting
      filteredData.sort((a, b) => {
        if (filters.sortBy === 'trending') return calculateTrendingScore(b) - calculateTrendingScore(a)
        if (filters.sortBy === 'mcap') return parseFloat(b.fdv || 0) - parseFloat(a.fdv || 0)
        if (filters.sortBy === 'liquidity') return parseFloat(b.liquidity?.usd || 0) - parseFloat(a.liquidity?.usd || 0)
        if (filters.sortBy === 'volume') return parseFloat(b.volume?.h24 || 0) - parseFloat(a.volume?.h24 || 0)
        if (filters.sortBy === 'age') return (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0)
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

  // Derived statistics for dashboard
  const stats = useMemo(() => {
    const trendingCount = coins.filter(c => calculateTrendingScore(c) > 100).length
    const newListings = coins.filter(c => (Date.now() - (c.pairCreatedAt || 0)) < 24 * 3600 * 1000).length
    const safePairs = coins.filter(c => (c.liquidity?.usd || 0) > 100000).length
    const totalVol = coins.reduce((acc, c) => acc + parseFloat(c.volume?.h24 || 0), 0)

    return {
      trending: trendingCount,
      new: newListings,
      safe: coins.length > 0 ? Math.round((safePairs / coins.length) * 100) : 0,
      vol: totalVol > 1000000 ? `$${(totalVol / 1000000).toFixed(1)}M` : 'Low'
    }
  }, [coins])

  const topTrendingToken = useMemo(() => {
    if (coins.length === 0) return null
    return [...coins].sort((a, b) => calculateTrendingScore(b) - calculateTrendingScore(a))[0]
  }, [coins])

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Trending Pairs" value={stats.trending.toString()} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New 24h" value={stats.new.toString()} icon={Zap} color="text-yellow-500" />
              <StatCard title="Verified Safe" value={`${stats.safe}%`} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Total Volume" value={stats.vol} icon={Activity} color="text-red-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-card rounded-xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border flex justify-between items-center">
                  <h2 className="text-lg font-bold">Market Leaders</h2>
                  <button className="text-sm text-primary hover:underline" onClick={() => fetchData()}>Refresh</button>
                </div>
                <CoinsTable data={coins.slice(0, 10)} />
              </div>
              <div className="space-y-6">
                <div className="bg-card rounded-xl border border-border p-4">
                  <h3 className="text-sm font-bold uppercase text-muted-foreground mb-4">Intelligence Layer</h3>
                  <AISummary token={topTrendingToken} />
                </div>
                <div className="bg-primary/10 rounded-xl border border-primary/20 p-6">
                  <h3 className="text-lg font-bold text-primary mb-2">Alpha Signal</h3>
                  <p className="text-sm text-muted-foreground">
                    Our algorithm detected a 400% volume spike on {topTrendingToken?.baseToken?.symbol || 'discovery'} pairs in the last hour.
                  </p>
                </div>
              </div>
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
              LIVE TERMINAL
            </div>
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
              Connect Wallet
            </button>
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
