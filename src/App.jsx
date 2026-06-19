import { useEffect, useCallback, useMemo } from 'react'
import Sidebar from './components/Sidebar'
import FiltersBar from './components/FiltersBar'
import CoinsTable from './components/CoinsTable'
import AISummary from './components/AISummary'
import useCoinStore from './store/useCoinStore'
import { coinService } from './services/api'
import { calculateTrendScore } from './lib/trending'
import { TrendingUp, Activity, ShieldCheck, Zap } from 'lucide-react'
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

      // Apply client-side filters
      let filteredData = data

      // Filter by DEX
      if (filters.dex !== 'all') {
        filteredData = filteredData.filter(p => p.dexId?.toLowerCase().includes(filters.dex.toLowerCase()))
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

      // Filter by Verified
      if (filters.verified) {
        filteredData = filteredData.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0)
      }

      // Sorting
      filteredData.sort((a, b) => {
        if (filters.sort === 'trending') return calculateTrendScore(b) - calculateTrendScore(a)
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

  const stats = useMemo(() => {
    if (!coins.length) return { trending: '0', new: '0', safe: '0%', volatility: 'Medium' }

    const highTrend = coins.filter(p => calculateTrendScore(p) > 70).length
    const newListings = coins.filter(p => {
      if (!p.pairCreatedAt) return false
      return (Date.now() - p.pairCreatedAt) < 24 * 60 * 60 * 1000
    }).length
    const safePairs = coins.filter(p => p.info?.websites?.length > 0).length
    const safePercent = Math.round((safePairs / coins.length) * 100)

    return {
      trending: highTrend.toLocaleString(),
      new: newListings.toLocaleString(),
      safe: `${safePercent}%`,
      volatility: newListings > 20 ? 'High' : 'Low'
    }
  }, [coins])

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Trending Pairs" value={stats.trending} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New 24h" value={stats.new} icon={Zap} color="text-yellow-500" />
              <StatCard title="Safe / Verified" value={stats.safe} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Volatility Index" value={stats.volatility} icon={Activity} color="text-red-500" />
            </div>

            {coins.length > 0 && <AISummary pair={coins[0]} />}

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
                <h2 className="text-lg font-bold">Global Market Discovery</h2>
                <button
                  className="text-xs bg-primary/10 text-primary px-3 py-1 rounded hover:bg-primary/20 transition-colors font-bold"
                  onClick={() => fetchData()}
                >
                  REFRESH DATA
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
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
            <div className="p-4 bg-muted rounded-full">
              <Activity size={48} className="animate-pulse" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-foreground capitalize">{view} View</h3>
              <p className="italic">This module is currently being indexed...</p>
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
          <div className="flex items-center space-x-4">
             <h2 className="text-xl font-black tracking-tighter uppercase">{view}</h2>
             <div className="h-4 w-[1px] bg-border"></div>
             <div className="flex items-center gap-2 px-2 py-0.5 bg-green-500/10 text-green-500 rounded text-[10px] font-bold">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              LIVE FEED
            </div>
          </div>
          <div className="flex items-center gap-6">
            {address ? (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none">Balance</p>
                  <p className="text-sm font-bold text-primary">{balance} ETH</p>
                </div>
                <div className="bg-secondary px-3 py-1.5 rounded-lg border border-border font-mono text-xs">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </div>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-all uppercase tracking-wider"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-slate-950/20">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <span className="text-xs font-bold text-muted-foreground animate-pulse uppercase tracking-widest">Indexing Terminal...</span>
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
      <p className="text-3xl font-black">{value}</p>
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
