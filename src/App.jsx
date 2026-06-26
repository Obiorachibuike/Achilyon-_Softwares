import { useEffect, useCallback, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar'
import FiltersBar from './components/FiltersBar'
import CoinsTable from './components/CoinsTable'
import useCoinStore from './store/useCoinStore'
import { coinService } from './services/api'
import { TrendingUp, Activity, ShieldCheck, Zap } from 'lucide-react'
import { cn } from './lib/utils'
import PropTypes from 'prop-types'

const App = () => {
  const { view, coins, setCoins, loading, setLoading, setError, filters, address, connectWallet } = useCoinStore()
  const [dashboardCoins, setDashboardCoins] = useState([])

  const stats = useMemo(() => {
    const data = view === 'dashboard' ? dashboardCoins : coins
    const trending = data.filter(c => parseFloat(c.volume?.h1 || 0) > 10000).length
    const newListings = data.filter(c => {
      if (!c.pairCreatedAt) return false
      const hours = (Date.now() - c.pairCreatedAt) / 1000 / 60 / 60
      return hours <= 24
    }).length
    const safePairs = data.filter(c => c.info?.websites?.length > 0 || c.info?.socials?.length > 0).length
    const safePercent = data.length > 0 ? Math.round((safePairs / data.length) * 100) : 0

    return {
      trending: trending.toLocaleString(),
      newListings: newListings.toString(),
      safePercent: `${safePercent}%`,
      marketPairs: data.length.toLocaleString()
    }
  }, [coins, dashboardCoins, view])

  const fetchData = useCallback(async (isInitial = false) => {
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

      setCoins(data)
      if (isInitial || view === 'dashboard') {
        setDashboardCoins(data)
      }
    } catch (err) {
      setError('Failed to fetch data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filters, setCoins, setError, setLoading, view])

  useEffect(() => {
    fetchData(dashboardCoins.length === 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData])

  const filteredCoins = useMemo(() => {
    let result = [...coins]

    if (filters.network !== 'all') {
      result = result.filter(c => c.chainId === filters.network || (filters.network === 'bnb' && c.chainId === 'bsc'))
    }

    if (filters.dex !== 'all') {
      result = result.filter(c => c.dexId?.toLowerCase().includes(filters.dex.toLowerCase()))
    }

    if (filters.liquidity !== 'all') {
      const minLiq = filters.liquidity.includes('10k') ? 10000 :
                     filters.liquidity.includes('100k') ? 100000 : 1000000
      result = result.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
    }

    if (filters.volume !== 'all') {
        const minVol = filters.volume.includes('10k') ? 10000 :
                       filters.volume.includes('100k') ? 100000 : 1000000
        result = result.filter(p => parseFloat(p.volume?.h24 || 0) >= minVol)
    }

    if (filters.marketCap !== 'all') {
        result = result.filter(p => {
            const mcap = parseFloat(p.fdv || 0)
            if (filters.marketCap === 'micro') return mcap < 1000000
            if (filters.marketCap === 'small') return mcap >= 1000000 && mcap < 10000000
            if (filters.marketCap === 'mid') return mcap >= 10000000 && mcap < 100000000
            if (filters.marketCap === 'large') return mcap >= 100000000
            return true
        })
    }

    if (filters.verified) {
        result = result.filter(c => c.info?.websites?.length > 0 || c.info?.socials?.length > 0)
    }

    if (filters.age !== 'all') {
        result = result.filter(c => {
            if (!c.pairCreatedAt) return false
            const hours = (Date.now() - c.pairCreatedAt) / 1000 / 60 / 60
            if (filters.age === '< 1h') return hours < 1
            if (filters.age === '< 6h') return hours < 6
            if (filters.age === '< 24h') return hours < 24
            if (filters.age === '< 7d') return hours < 168
            return true
        })
    }

    return result
  }, [coins, filters])

  const formattedView = view.replace('-', ' ')

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Trending Pairs" value={stats.trending} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New Listings (24h)" value={stats.newListings} icon={Zap} color="text-yellow-500" />
              <StatCard title="Safe/Verified" value={stats.safePercent} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Total Discovered" value={stats.marketPairs} icon={Activity} color="text-red-500" />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h2 className="text-lg font-bold">Top Market Pairs</h2>
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
              <CoinsTable data={filteredCoins} />
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
             <h2 className="text-xl font-bold capitalize">{formattedView}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              LIVE
            </div>
            {address ? (
              <div className="bg-secondary px-4 py-2 rounded-lg text-sm font-mono border border-border">
                {address.slice(0, 6)}...{address.slice(-4)}
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
