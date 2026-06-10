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
    balance,
    connectWallet
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

      // Secondary client-side filtering
      let filteredData = data

      // Filter by Network (Double check if API returned more than requested)
      if (filters.network !== 'all') {
        filteredData = filteredData.filter(p => p.chainId === filters.network)
      }

      // Filter by DEX
      if (filters.dex !== 'all') {
        filteredData = filteredData.filter(p => p.dexId?.toLowerCase().includes(filters.dex))
      }

      // Filter by Age
      if (filters.age !== 'all') {
        const now = Date.now()
        const maxAgeHours = filters.age === '1h' ? 1 : filters.age === '6h' ? 6 : filters.age === '24h' ? 24 : 168
        filteredData = filteredData.filter(p => {
          if (!p.pairCreatedAt) return false
          const ageHours = (now - p.pairCreatedAt) / 1000 / 60 / 60
          return ageHours <= maxAgeHours
        })
      }

      // Filter by Liquidity
      if (filters.liquidity !== 'all') {
        const minLiq = filters.liquidity === '10k' ? 10000 : filters.liquidity === '100k' ? 100000 : 1000000
        filteredData = filteredData.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
      }

      // Filter by Market Cap
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

      // Filter by Volume
      if (filters.volume !== 'all') {
        const minVol = 50000 // Sample threshold
        if (filters.volume === '1h') {
           filteredData = filteredData.filter(p => parseFloat(p.volume?.h1 || 0) >= minVol)
        } else {
           filteredData = filteredData.filter(p => parseFloat(p.volume?.h24 || 0) >= minVol)
        }
      }

      // Filter by Verified (Mock heuristic: has social links)
      if (filters.verified) {
        filteredData = filteredData.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0)
      }

      // Sorting
      filteredData.sort((a, b) => {
        if (filters.sortBy === 'trending') return calculateTrendingScore(b) - calculateTrendingScore(a)
        if (filters.sortBy === 'mcap') return (b.fdv || 0) - (a.fdv || 0)
        if (filters.sortBy === 'volume') return (b.volume?.h24 || 0) - (a.volume?.h24 || 0)
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

  // Dashboard Stats derived from current data
  const stats = useMemo(() => {
    const trendingCount = coins.filter(c => calculateTrendingScore(c) > 50).length
    const new24h = coins.filter(c => (Date.now() - (c.pairCreatedAt || 0)) < 86400000).length
    const verifiedPercent = coins.length > 0
      ? Math.round((coins.filter(c => c.info?.websites?.length > 0 || c.info?.socials?.length > 0).length / coins.length) * 100)
      : 0

    return {
      trending: trendingCount,
      new: new24h,
      safe: verifiedPercent + '%',
      volatility: coins.length > 0 ? 'High' : 'Stable'
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
              <StatCard title="Market Status" value={stats.volatility} icon={Activity} color="text-red-500" />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                <h2 className="text-lg font-bold">Top Trending Pairs</h2>
                <button className="text-sm text-primary hover:underline font-medium" onClick={() => fetchData()}>Refresh Data</button>
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
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="text-4xl mb-4">🚧</div>
            <p className="italic text-lg">{view.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} view is coming soon.</p>
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
             <h2 className="text-xl font-bold capitalize">{view.replaceAll('-', ' ')}</h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold tracking-widest uppercase">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              Live Terminal
            </div>
            {address ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs font-bold text-primary">{balance} ETH</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{address}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-blue-500"></div>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
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
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground animate-pulse">Scanning Chains...</p>
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
      <p className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
    <div className={cn("p-4 rounded-xl bg-secondary group-hover:scale-110 transition-transform", color)}>
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
