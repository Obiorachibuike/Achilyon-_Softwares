import { useEffect, useCallback, useMemo } from 'react'
import Sidebar from './components/Sidebar'
import FiltersBar from './components/FiltersBar'
import CoinsTable from './components/CoinsTable'
import useCoinStore from './store/useCoinStore'
import { coinService } from './services/api'
import { TrendingUp, Activity, ShieldCheck, Zap, Wallet as WalletIcon, FileText, Bell, UserCheck } from 'lucide-react'
import { cn } from './lib/utils'
import PropTypes from 'prop-types'

const App = () => {
  const {
    view, coins, setCoins, loading, setLoading, setError, filters,
    walletAddress, walletBalance, connectWallet
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
      // Network Filter (Secondary check for search results)
      if (filters.network !== 'all' && pair.chainId !== filters.network) return false

      // DEX Filter
      if (filters.dex !== 'all' && !pair.dexId.toLowerCase().includes(filters.dex)) return false

      // Age Filter
      if (filters.age !== 'all') {
        if (!pair.pairCreatedAt) return false
        const ageHours = (Date.now() - pair.pairCreatedAt) / 1000 / 60 / 60
        if (filters.age === '1h' && ageHours > 1) return false
        if (filters.age === '6h' && ageHours > 6) return false
        if (filters.age === '24h' && ageHours > 24) return false
        if (filters.age === '7d' && ageHours > 168) return false
      }

      // Liquidity Filter
      const liq = parseFloat(pair.liquidity?.usd || 0)
      if (filters.liquidity === '10k' && liq < 10000) return false
      if (filters.liquidity === '100k' && liq < 100000) return false
      if (filters.liquidity === '1m' && liq < 1000000) return false

      // Market Cap Filter
      const mcap = parseFloat(pair.fdv || 0)
      if (filters.marketCap === 'micro' && mcap >= 1000000) return false
      if (filters.marketCap === 'small' && (mcap < 1000000 || mcap >= 10000000)) return false
      if (filters.marketCap === 'mid' && (mcap < 10000000 || mcap >= 100000000)) return false
      if (filters.marketCap === 'large' && mcap < 100000000) return false

      // Volume Filter
      const vol = parseFloat(pair.volume?.h24 || 0)
      if (filters.volume === '50k' && vol < 50000) return false
      if (filters.volume === '500k' && vol < 500000) return false
      if (filters.volume === '5m' && vol < 5000000) return false

      // Verified Filter (Mock heuristic: has websites or socials)
      if (filters.verified) {
        const hasLinks = pair.info?.websites?.length > 0 || pair.info?.socials?.length > 0
        if (!hasLinks) return false
      }

      return true
    })
  }, [coins, filters])

  const stats = useMemo(() => {
    const trending = filteredCoins.length
    const newPairs = filteredCoins.filter(p => {
       if (!p.pairCreatedAt) return false
       return (Date.now() - p.pairCreatedAt) / 1000 / 60 / 60 < 24
    }).length
    const safePairs = filteredCoins.filter(p => p.info?.websites?.length > 0).length
    const safePercent = trending > 0 ? Math.round((safePairs / trending) * 100) : 0

    return {
      trending: trending.toLocaleString(),
      new: newPairs.toLocaleString(),
      safe: `${safePercent}%`,
      volatility: 'High'
    }
  }, [filteredCoins])

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Trending Pairs" value={stats.trending} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New 24h" value={stats.new} icon={Zap} color="text-yellow-500" />
              <StatCard title="Verified" value={stats.safe} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Volatility" value={stats.volatility} icon={Activity} color="text-red-500" />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Activity size={20} className="text-primary" />
                  Live Market Feed
                </h2>
                <button className="text-sm font-medium text-primary hover:underline px-3 py-1 rounded-md hover:bg-primary/10 transition-colors" onClick={() => fetchData()}>Refresh Feed</button>
              </div>
              <div className="overflow-hidden">
                <CoinsTable data={filteredCoins.slice(0, 15)} />
              </div>
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
      case 'wallets':
        return <PlaceholderView title="Wallet Tracking" icon={WalletIcon} description="Track whale wallets and monitor portfolio performance in real-time." />
      case 'contracts':
        return <PlaceholderView title="Contract Analysis" icon={FileText} description="Deep-dive into smart contracts for security audits and ownership details." />
      case 'alerts':
        return <PlaceholderView title="Price Alerts" icon={Bell} description="Set custom alerts for price movements, liquidity changes, and volume spikes." />
      case 'smart-money':
        return <PlaceholderView title="Smart Money Engine" icon={UserCheck} description="Follow the most profitable traders and detect early accumulation patterns." />
      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground italic">
            {view.charAt(0).toUpperCase() + view.slice(1)} view is under development...
          </div>
        )
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-card/50 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-4">
             <h2 className="text-xl font-black uppercase tracking-tighter text-primary">{view}</h2>
             <div className="flex items-center gap-2 px-2.5 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-black border border-primary/20">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
              LIVE NETWORK
            </div>
          </div>
          <div className="flex items-center gap-6">
            {walletAddress ? (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">Balance</div>
                  <div className="text-sm font-black text-primary leading-none mt-1">{walletBalance} ETH</div>
                </div>
                <div className="px-4 py-2 bg-secondary rounded-lg border border-border flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs font-mono font-bold">{walletAddress}</span>
                </div>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-background/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary border-t-transparent"></div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Syncing Chain Data...</div>
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
  <div className="bg-card p-6 rounded-xl border border-border flex items-center justify-between group hover:border-primary/50 transition-colors shadow-sm">
    <div>
      <p className="text-[10px] text-muted-foreground mb-1 font-black uppercase tracking-widest">{title}</p>
      <p className="text-3xl font-black tracking-tight">{value}</p>
    </div>
    <div className={cn("p-4 rounded-xl bg-secondary transition-transform group-hover:scale-110", color)}>
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

const PlaceholderView = ({ title, icon: Icon, description }) => (
  <div className="flex flex-col items-center justify-center h-full p-12 text-center max-w-2xl mx-auto">
    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-8 border border-primary/20 rotate-3">
      <Icon size={40} />
    </div>
    <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter">{title}</h2>
    <p className="text-muted-foreground leading-relaxed mb-8 font-medium">
      {description}
    </p>
    <div className="grid grid-cols-2 gap-4 w-full">
      <div className="h-32 rounded-2xl bg-muted/50 border border-border border-dashed animate-pulse"></div>
      <div className="h-32 rounded-2xl bg-muted/50 border border-border border-dashed animate-pulse"></div>
    </div>
  </div>
)

PlaceholderView.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  description: PropTypes.string.isRequired,
}

export default App
