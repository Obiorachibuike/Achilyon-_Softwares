import { useEffect, useCallback, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar'
import FiltersBar from './components/FiltersBar'
import CoinsTable from './components/CoinsTable'
import useCoinStore from './store/useCoinStore'
import { coinService } from './services/api'
import { calculateTrendingScore } from './lib/trending'
import { TrendingUp, Activity, ShieldCheck, Zap } from 'lucide-react'
import { cn, formatCompactNumber } from './lib/utils'
import PropTypes from 'prop-types'

const App = () => {
  const { view, coins, setCoins, loading, setLoading, setError, filters, address, connectWallet } = useCoinStore()
  const [dashboardCoins, setDashboardCoins] = useState([])

  const getMappedChainId = (chain) => {
    if (chain === 'bnb') return 'bsc';
    return chain;
  };

  const fetchData = useCallback(async (isInitial = false) => {
    setLoading(true)
    try {
      let data = []
      const chainId = getMappedChainId(filters.network);

      if (filters.searchQuery) {
        data = await coinService.searchPairs(filters.searchQuery)
      } else if (filters.network !== 'all') {
        data = await coinService.getPairsByChain(chainId)
      } else {
        data = await coinService.getTrending()
      }

      // Enrich data with trending scores
      const enrichedData = data.map(pair => ({
        ...pair,
        trendingScore: calculateTrendingScore(pair)
      }))

      if (isInitial || view === 'dashboard') {
        setDashboardCoins(enrichedData);
      }

      setCoins(enrichedData)
    } catch (err) {
      setError('Failed to fetch data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filters.network, filters.searchQuery, setCoins, setError, setLoading, view])

  useEffect(() => {
    // Re-fetch only when network or search query changes (captured by fetchData's deps)
    // The isInitial flag ensures dashboard coins are populated on the first load of any relevant data
    fetchData(true)
  }, [fetchData])

  const filteredAndSortedCoins = useMemo(() => {
    let result = [...coins]

    // 1. Filter by DEX
    if (filters.dex !== 'all') {
      result = result.filter(p => p.dexId?.toLowerCase() === filters.dex.toLowerCase())
    }

    // 2. Filter by Age
    if (filters.age !== 'all') {
      const now = Date.now()
      const limitMap = {
        '1h': 1 * 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
      }
      const limit = limitMap[filters.age]
      result = result.filter(p => p.pairCreatedAt && (now - p.pairCreatedAt) <= limit)
    }

    // 3. Filter by Liquidity
    if (filters.liquidity !== 'all') {
      const minLiq = filters.liquidity === '10k' ? 10000 :
                     filters.liquidity === '100k' ? 100000 : 1000000
      result = result.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
    }

    // 4. Filter by Market Cap
    if (filters.marketCap !== 'all') {
      result = result.filter(p => {
        const mcap = p.fdv || 0
        if (filters.marketCap === 'micro') return mcap < 1000000
        if (filters.marketCap === 'small') return mcap >= 1000000 && mcap < 10000000
        if (filters.marketCap === 'mid') return mcap >= 10000000 && mcap < 100000000
        if (filters.marketCap === 'large') return mcap >= 100000000
        return true
      })
    }

    // 5. Filter by Volume
    if (filters.volume !== 'all') {
      const minVol = filters.volume === '10k' ? 10000 :
                     filters.volume === '100k' ? 100000 : 1000000
      result = result.filter(p => parseFloat(p.volume?.h24 || 0) >= minVol)
    }

    // 6. Verified Filter (heuristic: has website or socials)
    if (filters.verified) {
      result = result.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0)
    }

    // 7. Sort
    result.sort((a, b) => {
      if (filters.sortBy === 'trending') return (b.trendingScore || 0) - (a.trendingScore || 0)
      if (filters.sortBy === 'mcap') return (b.fdv || 0) - (a.fdv || 0)
      if (filters.sortBy === 'volume') return (parseFloat(b.volume?.h24 || 0)) - (parseFloat(a.volume?.h24 || 0))
      if (filters.sortBy === 'age') return (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0)
      return 0
    })

    return result
  }, [coins, filters])

  const stats = useMemo(() => {
    const activePairs = dashboardCoins.length
    const trending = dashboardCoins.filter(c => c.trendingScore >= 60).length
    const verified = dashboardCoins.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0).length
    const avgVol = dashboardCoins.reduce((acc, curr) => acc + (parseFloat(curr.volume?.h24 || 0)), 0) / (activePairs || 1)

    return {
      activePairs: formatCompactNumber(activePairs),
      trending,
      safePercent: activePairs > 0 ? Math.round((verified / activePairs) * 100) : 0,
      avgVol: formatCompactNumber(avgVol)
    }
  }, [dashboardCoins])

  const renderContent = () => {
    const formattedView = view.replace('-', ' ')
    switch (view) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Trending Pairs" value={stats.trending.toString()} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New 24h" value={stats.activePairs} icon={Zap} color="text-yellow-500" />
              <StatCard title="Safe / Verified" value={`${stats.safePercent}%`} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Avg. Volume" value={`$${stats.avgVol}`} icon={Activity} color="text-red-500" />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h2 className="text-lg font-bold">Top Trending Pairs</h2>
                <button className="text-sm text-primary hover:underline" onClick={() => fetchData()}>Refresh</button>
              </div>
              <CoinsTable data={dashboardCoins.slice(0, 10)} />
            </div>
          </div>
        )
      case 'coins':
        return (
          <div className="flex flex-col h-full">
            <FiltersBar />
            <div className="flex-1 overflow-auto bg-card">
              <CoinsTable data={filteredAndSortedCoins} />
            </div>
          </div>
        )
      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground italic">
            {formattedView.charAt(0).toUpperCase() + formattedView.slice(1)} view is under development...
          </div>
        )
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-card/50 backdrop-blur-sm sticky top-0 z-10 shrink-0">
          <div className="flex items-center space-y-1">
             <h2 className="text-xl font-bold capitalize">{view.replace('-', ' ')}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              LIVE
            </div>
            {address ? (
                <div className="flex items-center gap-3 bg-secondary px-4 py-2 rounded-lg border border-border">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-mono">{address}</span>
                    <span className="text-xs font-bold text-primary ml-2">{(1 + Math.random() * 9).toFixed(2)} ETH</span>
                </div>
            ) : (
                <button
                    onClick={connectWallet}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 active:scale-95 transition-transform"
                >
                Connect Wallet
                </button>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-hidden relative">
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
