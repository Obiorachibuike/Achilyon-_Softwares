import { useEffect, useCallback, useMemo } from 'react'
import Sidebar from './components/Sidebar'
import FiltersBar from './components/FiltersBar'
import CoinsTable from './components/CoinsTable'
import useCoinStore from './store/useCoinStore'
import { coinService } from './services/api'
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
      setCoins(data)
    } catch (err) {
      setError('Failed to fetch data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filters.network, filters.searchQuery, setCoins, setError, setLoading])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredCoins = useMemo(() => {
    return coins.filter(pair => {
      // 1. Network Filter (Secondary check for search results)
      if (filters.network !== 'all' && pair.chainId !== (filters.network === 'bnb' ? 'bsc' : filters.network)) {
         // DexScreener search can return other chains, but if a specific network is selected, we filter it
         if (!filters.searchQuery) return false // getPairsByChain already filters, but search doesn't
      }

      // 2. DEX Filter
      if (filters.dex !== 'all' && pair.dexId?.toLowerCase() !== filters.dex.toLowerCase()) {
        return false
      }

      // 3. Age Filter
      if (filters.age !== 'all') {
        if (!pair.pairCreatedAt) return false
        const ageHours = (Date.now() - pair.pairCreatedAt) / 1000 / 60 / 60
        const ageLimit = filters.age === '1h' ? 1 : filters.age === '6h' ? 6 : filters.age === '24h' ? 24 : 168
        if (ageHours > ageLimit) return false
      }

      // 4. Liquidity Filter
      if (filters.liquidity !== 'all') {
        const liq = parseFloat(pair.liquidity?.usd || 0)
        const minLiq = filters.liquidity === '10k' ? 10000 : filters.liquidity === '100k' ? 100000 : 1000000
        if (liq < minLiq) return false
      }

      // 5. Market Cap Filter
      if (filters.marketCap !== 'all') {
        const mcap = parseFloat(pair.fdv || 0)
        if (filters.marketCap === 'micro' && mcap >= 1000000) return false
        if (filters.marketCap === 'small' && (mcap < 1000000 || mcap >= 10000000)) return false
        if (filters.marketCap === 'mid' && (mcap < 10000000 || mcap >= 100000000)) return false
        if (filters.marketCap === 'large' && mcap < 100000000) return false
      }

      // 6. Volume Filter
      if (filters.volume !== 'all') {
        const vol = parseFloat(pair.volume?.h24 || 0)
        const minVol = filters.volume === '50k' ? 50000 : filters.volume === '250k' ? 250000 : 1000000
        if (vol < minVol) return false
      }

      // 7. Verified Filter
      if (filters.verifiedOnly) {
        const hasSocials = pair.info?.socials?.length > 0 || pair.info?.websites?.length > 0
        if (!hasSocials) return false
      }

      return true
    })
  }, [coins, filters])

  // Dashboard stats derived from data
  const stats = useMemo(() => {
    const trending = filteredCoins.filter(p => (parseFloat(p.volume?.h1 || 0) > parseFloat(p.volume?.h24 || 0) / 48)).length
    const newListings = filteredCoins.filter(p => p.pairCreatedAt && (Date.now() - p.pairCreatedAt) < 3600000 * 24).length
    const safePairs = filteredCoins.filter(p => p.info?.socials?.length > 0 || p.info?.websites?.length > 0).length
    const safePercent = filteredCoins.length > 0 ? Math.round((safePairs / filteredCoins.length) * 100) : 0

    return {
      trending: trending.toLocaleString(),
      new: newListings.toLocaleString(),
      safe: `${safePercent}%`,
      volatility: 'High'
    }
  }, [filteredCoins])

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Trending Pairs" value={stats.trending} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New Listings (24h)" value={stats.new} icon={Zap} color="text-yellow-500" />
              <StatCard title="Safe/Verified" value={stats.safe} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Market Volatility" value={stats.volatility} icon={Activity} color="text-red-500" />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h2 className="text-lg font-bold text-foreground">Top Market Pairs</h2>
                <button
                  className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  onClick={() => fetchData()}
                >
                  Refresh Data
                </button>
              </div>
              <CoinsTable data={filteredCoins.slice(0, 10)} />
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
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="text-4xl mb-4 opacity-20">🚧</div>
            <p className="italic capitalize">{view.replace('-', ' ')} view is under development...</p>
          </div>
        )
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4">
             <h2 className="text-xl font-bold capitalize">{view.replace('-', ' ')}</h2>
             {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>}
          </div>
          <div className="flex items-center gap-6">
            {address ? (
              <div className="flex flex-col items-end">
                <div className="text-sm font-bold font-mono">{address.slice(0,6)}...{address.slice(-4)}</div>
                <div className="text-[10px] text-muted-foreground font-medium">{balance} ETH</div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                LIVE MARKET
              </div>
            )}
            <button
              onClick={connectWallet}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                address
                  ? "bg-secondary text-foreground hover:bg-muted"
                  : "bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/20 active:scale-95"
              )}
            >
              {address ? 'Wallet Connected' : 'Connect Wallet'}
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-background/50">
          {renderContent()}
        </div>
      </main>
    </div>
  )
}

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-card p-6 rounded-xl border border-border flex items-center justify-between hover:border-primary/50 transition-colors group">
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
    <div className={cn("p-3 rounded-xl bg-secondary group-hover:scale-110 transition-transform", color)}>
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
