import { useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import FiltersBar from './components/FiltersBar'
import CoinsTable from './components/CoinsTable'
import useCoinStore from './store/useCoinStore'
import { coinService } from './services/api'
import { TrendingUp, Activity, ShieldCheck, Zap, Wallet as WalletIcon, Search } from 'lucide-react'
import { cn } from './lib/utils'
import { calculateTrendingScore } from './lib/trending'
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

      // Filter by DEX
      if (filters.dex !== 'all') {
        filteredData = filteredData.filter(p => p.dexId?.toLowerCase() === filters.dex.toLowerCase() || p.dexId?.toLowerCase().includes(filters.dex.toLowerCase()))
      }

      // Filter by Age
      if (filters.age && filters.age !== 'all') {
        const now = Date.now()
        let maxAgeMs = 0
        if (filters.age.includes('1h')) maxAgeMs = 3600 * 1000
        else if (filters.age.includes('6h')) maxAgeMs = 6 * 3600 * 1000
        else if (filters.age.includes('24h')) maxAgeMs = 24 * 3600 * 1000
        else if (filters.age.includes('7d')) maxAgeMs = 7 * 24 * 3600 * 1000

        if (maxAgeMs > 0) {
          filteredData = filteredData.filter(p => p.pairCreatedAt && (now - p.pairCreatedAt) <= maxAgeMs)
        }
      }

      // Filter by Liquidity
      if (filters.liquidity !== 'all') {
        const minLiq = filters.liquidity.includes('10k') ? 10000 :
                       filters.liquidity.includes('100k') ? 100000 : 1000000
        filteredData = filteredData.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
      }

      // Filter by Market Cap
      if (filters.marketCap !== 'all') {
        const mc = filters.marketCap.toLowerCase()
        filteredData = filteredData.filter(p => {
          const val = parseFloat(p.fdv || 0)
          if (mc.includes('micro')) return val < 100000
          if (mc.includes('small')) return val >= 100000 && val < 1000000
          if (mc.includes('mid')) return val >= 1000000 && val < 50000000
          if (mc.includes('large')) return val >= 50000000
          return true
        })
      }

      // Filter by Volume
      if (filters.volume !== 'all') {
        const minVol = filters.volume.includes('10k') ? 10000 :
                       filters.volume.includes('100k') ? 100000 :
                       filters.volume.includes('1m') ? 1000000 : 10000000
        filteredData = filteredData.filter(p => parseFloat(p.volume?.h24 || 0) >= minVol)
      }

      // Filter by Buy/Sell Ratio
      if (filters.buysSellsRatio !== 'all') {
        const threshold = parseFloat(filters.buysSellsRatio.replace('>', ''))
        filteredData = filteredData.filter(p => {
          const buys = p.txns?.h24?.buys || 0
          const sells = p.txns?.h24?.sells || 1
          return (buys / sells) >= threshold
        })
      }

      // Filter by Verified
      if (filters.verified) {
        // Mock verified status based on some heuristic if API doesn't provide it directly
        // Or if it does, check the field. DexScreener doesn't have a direct "verified" flag in search pairs
        // but we can mock it for this discovery terminal
        filteredData = filteredData.filter(p => p.fdv > 100000 && p.liquidity?.usd > 50000)
      }

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
              <StatCard title="Trending Pairs" value="1,284" icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New Listings" value="42" icon={Zap} color="text-yellow-500" />
              <StatCard title="Safe Pairs" value="85%" icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Market Volatility" value="High" icon={Activity} color="text-red-500" />
            </div>

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
      case 'trending':
        return (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-border bg-card/30">
               <h1 className="text-2xl font-bold flex items-center gap-2">
                 <TrendingUp className="text-primary" />
                 Trending Now
               </h1>
               <p className="text-muted-foreground text-sm mt-1">Tokens sorted by volume spikes, buy pressure, and liquidity growth.</p>
            </div>
            <div className="flex-1 overflow-auto bg-card">
              <CoinsTable data={[...coins].sort((a, b) => calculateTrendingScore(b) - calculateTrendingScore(a))} />
            </div>
          </div>
        )
      case 'wallets':
        return (
          <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <WalletIcon size={32} className="text-primary" />
                Wallet Intelligence
              </h1>
              <p className="text-muted-foreground">Track any wallet, monitor portfolios, and get alerts for on-chain movements.</p>
            </div>

            <div className="bg-card border border-border p-8 rounded-2xl space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Wallet Address</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter EVM or Solana address..."
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-4 pl-12 outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                </div>
              </div>

              <button className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                Track Portfolio
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card/50 border border-border p-6 rounded-xl space-y-3">
                <h3 className="font-bold">Recent Searches</h3>
                <p className="text-sm text-muted-foreground italic">No recent searches found.</p>
              </div>
              <div className="bg-card/50 border border-border p-6 rounded-xl space-y-3">
                <h3 className="font-bold">Smart Money Wallets</h3>
                <p className="text-sm text-muted-foreground">Connect your wallet to unlock Smart Money tracking.</p>
              </div>
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
             <h2 className="text-xl font-bold capitalize">{view.replace('-', ' ')}</h2>
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
