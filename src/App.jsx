
import { useEffect, useCallback, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar'
import FiltersBar from './components/FiltersBar'
import CoinsTable from './components/CoinsTable'
import useCoinStore from './store/useCoinStore'
import { coinService } from './services/api'
import { TrendingUp, Activity, ShieldCheck, Zap } from 'lucide-react'
import { cn } from './lib/utils'
import PropTypes from 'prop-types'
import { calculateTrendingScore } from './lib/trending'

const App = () => {
  const {
    view, coins, setCoins, loading, setLoading, setError, filters,
    address, balance, connectWallet
  } = useCoinStore()

  // Use a separate state for dashboard coins to avoid filter interference
  const [dashboardCoins, setDashboardCoins] = useState([])

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

      // Filter by Network (if searchQuery was used)
      if (filters.network !== 'all') {
        const mappedChain = filters.network === 'bnb' ? 'bsc' : filters.network
        filteredData = filteredData.filter(p => p.chainId === mappedChain)
      }

      // Filter by DEX
      if (filters.dex !== 'all') {
        filteredData = filteredData.filter(p => p.dexId?.toLowerCase().includes(filters.dex))
      }

      // Filter by Age
      if (filters.age !== 'all') {
        const now = Date.now()
        const maxAgeMs = filters.age === '1h' ? 3600000 :
                        filters.age === '6h' ? 21600000 :
                        filters.age === '24h' ? 86400000 : 604800000
        filteredData = filteredData.filter(p => p.pairCreatedAt && (now - p.pairCreatedAt) <= maxAgeMs)
      }

      // Filter by Liquidity
      if (filters.liquidity !== 'all') {
        const minLiq = filters.liquidity === '10k' ? 10000 :
                       filters.liquidity === '100k' ? 100000 : 1000000
        filteredData = filteredData.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
      }

      // Filter by Market Cap
      if (filters.marketCap !== 'all') {
        filteredData = filteredData.filter(p => {
          const mcap = parseFloat(p.fdv || 0)
          if (filters.marketCap === 'micro') return mcap < 100000
          if (filters.marketCap === 'small') return mcap >= 100000 && mcap < 1000000
          if (filters.marketCap === 'mid') return mcap >= 1000000 && mcap < 10000000
          if (filters.marketCap === 'large') return mcap >= 10000000
          return true
        })
      }

      // Filter by Volume
      if (filters.volume !== 'all') {
        const minVol = filters.volume === '50k' ? 50000 :
                       filters.volume === '200k' ? 200000 : 1000000
        filteredData = filteredData.filter(p => parseFloat(p.volume?.h24 || 0) >= minVol)
      }

      // Filter by Verified (Heuristic: has social links or website)
      if (filters.verified) {
        filteredData = filteredData.filter(p => p.info?.socials?.length > 0 || p.info?.websites?.length > 0)
      }

      // Sorting
      filteredData.sort((a, b) => {
        if (filters.sortBy === 'trending') return calculateTrendingScore(b) - calculateTrendingScore(a)
        if (filters.sortBy === 'marketCap') return parseFloat(b.fdv || 0) - parseFloat(a.fdv || 0)
        if (filters.sortBy === 'volume') return parseFloat(b.volume?.h24 || 0) - parseFloat(a.volume?.h24 || 0)
        if (filters.sortBy === 'age') return (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0)
        return 0
      })

      if (view === 'dashboard' && !filters.searchQuery && filters.network === 'all') {
        setDashboardCoins(filteredData)
      }

      setCoins(filteredData)
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

  const stats = useMemo(() => {
    const data = view === 'dashboard' ? dashboardCoins : coins
    if (!data.length) return { trending: '0', new24h: '0', safe: '0%', volatility: 'Medium' }

    const trendingValue = data.length.toLocaleString()
    const new24hValue = data.filter(p => p.pairCreatedAt && (Date.now() - p.pairCreatedAt) < 86400000).length
    const safeCount = data.filter(p => p.info?.socials?.length > 0 || p.info?.websites?.length > 0).length
    const safeValue = data.length > 0 ? Math.round((safeCount / data.length) * 100) : 0

    return {
      trending: trendingValue,
      new24h: new24hValue.toString(),
      safe: `${safeValue}%`,
      volatility: 'High'
    }
  }, [coins, dashboardCoins, view])

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Trending Pairs" value={stats.trending} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New 24h" value={stats.new24h} icon={Zap} color="text-yellow-500" />
              <StatCard title="Safe/Verified" value={stats.safe} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Market Volatility" value={stats.volatility} icon={Activity} color="text-red-500" />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
                <h2 className="text-lg font-bold">Top Trending Pairs</h2>
                <button className="text-sm text-primary hover:underline font-medium" onClick={() => fetchData()}>Refresh</button>
              </div>
              <CoinsTable data={dashboardCoins.slice(0, 15)} />
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
          <div className="flex items-center">
             <h2 className="text-xl font-bold capitalize">{view}</h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-xs font-bold">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              LIVE FEED
            </div>
            {address ? (
               <div className="flex items-center gap-3">
                 <div className="text-right">
                   <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Balance</p>
                   <p className="text-sm font-bold">{balance} ETH</p>
                 </div>
                 <div className="px-3 py-1.5 bg-secondary rounded-lg border border-border text-xs font-mono font-medium">
                   {address.slice(0, 6)}...{address.slice(-4)}
                 </div>
               </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-muted/10">
          {loading && coins.length === 0 ? (
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
  <div className="bg-card p-6 rounded-xl border border-border flex items-center justify-between shadow-sm">
    <div>
      <p className="text-xs text-muted-foreground mb-1 font-bold uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
    <div className={cn("p-3 rounded-xl bg-secondary/50", color)}>
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
