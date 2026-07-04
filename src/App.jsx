import { useEffect, useCallback } from 'react'
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
  const { view, coins, setCoins, loading, setLoading, setError, filters, address, connectWallet } = useCoinStore()

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

      // Augment data with trending score
      let augmentedData = data.map(p => ({
        ...p,
        trendingScore: calculateTrendingScore(p)
      }))

      // Apply client-side filters
      let filteredData = augmentedData

      // Network filter (DexScreener search is broad, so we might need to filter again if not searching by chain)
      if (filters.network !== 'all' && !filters.searchQuery) {
         filteredData = filteredData.filter(p => p.chainId === filters.network)
      }

      // DEX filter
      if (filters.dex !== 'all') {
        filteredData = filteredData.filter(p => p.dexId?.toLowerCase() === filters.dex.toLowerCase())
      }

      // Age filter
      if (filters.age !== 'all') {
        const now = Date.now()
        const maxAgeHours = filters.age.includes('1h') ? 1 :
                           filters.age.includes('6h') ? 6 :
                           filters.age.includes('24h') ? 24 :
                           filters.age.includes('7d') ? 168 : Infinity

        filteredData = filteredData.filter(p => {
          if (!p.pairCreatedAt) return false
          const ageHours = (now - p.pairCreatedAt) / 1000 / 60 / 60
          return ageHours <= maxAgeHours
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
        const minVol = filters.volume.includes('10k') ? 10000 :
                       filters.volume.includes('100k') ? 100000 : 1000000
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

      // Sorting
      filteredData.sort((a, b) => {
        if (filters.sort === 'trending') return b.trendingScore - a.trendingScore
        if (filters.sort === 'mcap') return (b.fdv || 0) - (a.fdv || 0)
        if (filters.sort === 'volume') return (b.volume?.h24 || 0) - (a.volume?.h24 || 0)
        if (filters.sort === 'age') return (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0)
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

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Trending Pairs" value={coins.length.toString()} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New Listings" value={coins.filter(c => ((Date.now() - (c.pairCreatedAt || 0)) / 1000 / 60 / 60) < 24).length.toString()} icon={Zap} color="text-yellow-500" />
              <StatCard title="Safe Pairs" value="85%" icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Market Volatility" value="High" icon={Activity} color="text-red-500" />
            </div>

            {coins.length > 0 && <AISummary token={coins[0]} />}

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h2 className="text-lg font-bold">Top Market Pairs</h2>
                <button className="text-sm text-primary hover:underline" onClick={() => fetchData()}>Refresh</button>
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
            <button
              onClick={connectWallet}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-all active:scale-95"
            >
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connect Wallet'}
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
