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
  const {
    view,
    coins,
    setCoins,
    loading,
    setLoading,
    setError,
    filters,
    address,
    connected,
    connectWallet,
    disconnectWallet
  } = useCoinStore()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let data = []
      if (view === 'coins' && filters.network !== 'all') {
        data = await coinService.getPairsByChain(filters.network)
      } else {
        data = await coinService.getTrending()
      }
      setCoins(data)
    } catch (err) {
      setError('Failed to fetch data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filters.network, view, setCoins, setError, setLoading])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredAndSortedCoins = useMemo(() => {
    let result = [...coins]

    // 1. Filter by Network (Secondary check)
    if (filters.network !== 'all') {
      const targetChain = filters.network === 'bnb' ? 'bsc' : filters.network
      result = result.filter(p => p.chainId === targetChain)
    }

    // 2. Filter by DEX
    if (filters.dex !== 'all') {
      result = result.filter(p => p.dexId?.toLowerCase().includes(filters.dex.toLowerCase()))
    }

    // 3. Filter by Age
    if (filters.age !== 'all') {
      const now = Date.now()
      const oneHour = 60 * 60 * 1000
      const sixHours = 6 * oneHour
      const twentyFourHours = 24 * oneHour
      const sevenDays = 7 * twentyFourHours

      result = result.filter(p => {
        if (!p.pairCreatedAt) return false
        const ageMs = now - p.pairCreatedAt
        if (filters.age === '< 1h') return ageMs < oneHour
        if (filters.age === '< 6h') return ageMs < sixHours
        if (filters.age === '< 24h') return ageMs < twentyFourHours
        if (filters.age === '< 7d') return ageMs < sevenDays
        return true
      })
    }

    // 4. Filter by Liquidity
    if (filters.liquidity !== 'all') {
      const minLiq = filters.liquidity.includes('10k') ? 10000 :
                     filters.liquidity.includes('100k') ? 100000 : 1000000
      result = result.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
    }

    // 5. Filter by Market Cap
    if (filters.marketCap !== 'all') {
      result = result.filter(p => {
        const fdv = parseFloat(p.fdv || 0)
        if (filters.marketCap === 'micro') return fdv < 1000000
        if (filters.marketCap === 'small') return fdv >= 1000000 && fdv < 10000000
        if (filters.marketCap === 'mid') return fdv >= 10000000 && fdv < 100000000
        if (filters.marketCap === 'large') return fdv >= 100000000
        return true
      })
    }

    // 6. Filter by Volume
    if (filters.volume !== 'all') {
      const minVol = filters.volume.includes('10k') ? 10000 :
                     filters.volume.includes('100k') ? 100000 : 1000000
      result = result.filter(p => parseFloat(p.volume?.h24 || 0) >= minVol)
    }

    // 7. Filter by Verified
    if (filters.verified) {
      result = result.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0)
    }

    // 8. Filter by Search Query
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase()
      result = result.filter(p =>
        p.baseToken?.symbol?.toLowerCase().includes(q) ||
        p.baseToken?.name?.toLowerCase().includes(q) ||
        p.pairAddress?.toLowerCase().includes(q)
      )
    }

    // 9. Sorting
    result.sort((a, b) => {
      if (filters.sortBy === 'trending') {
        return calculateTrendingScore(b) - calculateTrendingScore(a)
      }
      if (filters.sortBy === 'marketCap') {
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

    return result
  }, [coins, filters])

  const stats = useMemo(() => {
    const trendingCount = coins.filter(p => calculateTrendingScore(p) > 50).length
    const newCount = coins.filter(p => (Date.now() - (p.pairCreatedAt || 0)) < 24 * 60 * 60 * 1000).length
    const verifiedCount = coins.filter(p => p.info?.websites?.length > 0).length
    const verifiedRate = coins.length > 0 ? Math.round((verifiedCount / coins.length) * 100) : 0

    return {
      trending: trendingCount,
      new: newCount,
      verified: `${verifiedRate}%`,
      volatility: 'High'
    }
  }, [coins])

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Trending Pairs" value={stats.trending.toString()} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New Listings (24h)" value={stats.new.toString()} icon={Zap} color="text-yellow-500" />
              <StatCard title="Safe/Verified" value={stats.verified} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Market Volatility" value={stats.volatility} icon={Activity} color="text-red-500" />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h2 className="text-lg font-bold">Top Trending Pairs</h2>
                <button className="text-sm text-primary hover:underline" onClick={() => fetchData()}>Refresh</button>
              </div>
              <CoinsTable data={filteredAndSortedCoins.slice(0, 10)} />
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
            {connected ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-foreground">{address}</p>
                  <p className="text-[10px] text-muted-foreground">3.42 ETH</p>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="bg-secondary text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted border border-border"
                >
                  Disconnect
                </button>
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
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground animate-pulse">Scanning the blocks...</p>
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
  <div className="bg-card p-6 rounded-xl border border-border flex items-center justify-between hover:border-primary/50 transition-colors cursor-default group">
    <div>
      <p className="text-sm text-muted-foreground mb-1 group-hover:text-foreground transition-colors">{title}</p>
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
