import { useEffect, useCallback, useState } from 'react'
import Sidebar from './components/Sidebar'
import FiltersBar from './components/FiltersBar'
import CoinsTable from './components/CoinsTable'
import AISummary from './components/AISummary'
import useCoinStore from './store/useCoinStore'
import { coinService } from './services/api'
import { TrendingUp, Activity, ShieldCheck, Zap } from 'lucide-react'
import { cn } from './lib/utils'
import PropTypes from 'prop-types'

const App = () => {
  const { view, coins, setCoins, loading, setLoading, setError, filters } = useCoinStore()
  const [debouncedSearch, setDebouncedSearch] = useState(filters.searchQuery)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.searchQuery)
    }, 500)
    return () => clearTimeout(timer)
  }, [filters.searchQuery])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let data = []
      if (debouncedSearch) {
        data = await coinService.searchPairs(debouncedSearch)
      } else if (filters.network !== 'all') {
        data = await coinService.getPairsByChain(filters.network)
      } else {
        data = await coinService.getTrending()
      }

      // Apply client-side filters (since DexScreener search is broad)
      let filteredData = data

      // Filter by Network (when searching, the API might return results from other networks)
      if (filters.network !== 'all') {
        filteredData = filteredData.filter(p => p.chainId?.toLowerCase() === filters.network.toLowerCase())
      }

      // Filter by DEX
      if (filters.dex !== 'all') {
        filteredData = filteredData.filter(p => p.dexId?.toLowerCase() === filters.dex.toLowerCase())
      }

      // Filter by Liquidity
      if (filters.liquidity !== 'all') {
        const minLiq = filters.liquidity.includes('10k') ? 10000 :
                       filters.liquidity.includes('100k') ? 100000 : 1000000
        filteredData = filteredData.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
      }

      // Filter by Volume
      if (filters.volume !== 'all') {
        const minVol = filters.volume.includes('10k') ? 10000 :
                       filters.volume.includes('100k') ? 100000 : 1000000
        filteredData = filteredData.filter(p => parseFloat(p.volume?.h24 || 0) >= minVol)
      }

      // Filter by Market Cap (FDV as proxy)
      if (filters.marketCap !== 'all') {
        filteredData = filteredData.filter(p => {
          const fdv = parseFloat(p.fdv || 0)
          if (filters.marketCap === 'micro-cap') return fdv < 1000000
          if (filters.marketCap === 'small-cap') return fdv >= 1000000 && fdv < 10000000
          if (filters.marketCap === 'mid-cap') return fdv >= 10000000 && fdv < 100000000
          if (filters.marketCap === 'large-cap') return fdv >= 100000000
          return true
        })
      }

      // Filter by Age
      if (filters.age && filters.age !== 'all') {
        const now = Date.now()
        const maxAgeHours = filters.age.includes('1h') ? 1 :
                            filters.age.includes('6h') ? 6 :
                            filters.age.includes('24h') ? 24 : 168
        filteredData = filteredData.filter(p => {
          if (!p.pairCreatedAt) return true // If no age data, don't filter it out by age
          return (now - p.pairCreatedAt) / 1000 / 60 / 60 <= maxAgeHours
        })
      }

      setCoins(filteredData)
    } catch (err) {
      setError('Failed to fetch data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filters, debouncedSearch, setCoins, setError, setLoading])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Trending Pairs" value={coins.length.toString()} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New Listings (1h)" value={coins.filter(p => (Date.now() - p.pairCreatedAt) / 1000 / 3600 < 1).length.toString()} icon={Zap} color="text-yellow-500" />
              <StatCard title="Safe Pairs" value="85%" icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Market Volatility" value="High" icon={Activity} color="text-red-500" />
            </div>

            {coins.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-card rounded-xl border border-border overflow-hidden">
                  <div className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-lg font-bold">Top Market Pairs</h2>
                    <button className="text-sm text-primary hover:underline" onClick={() => fetchData()}>Refresh</button>
                  </div>
                  <CoinsTable data={coins.slice(0, 10)} />
                </div>
                <div className="space-y-6">
                   <div className="bg-card p-6 rounded-xl border border-border">
                      <h3 className="font-bold mb-4">Market Intelligence</h3>
                      <AISummary token={coins[0]} />
                   </div>
                </div>
              </div>
            )}
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
