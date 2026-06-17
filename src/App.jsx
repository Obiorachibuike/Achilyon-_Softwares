import { useEffect, useCallback, useMemo } from 'react'
import Sidebar from './components/Sidebar'
import FiltersBar from './components/FiltersBar'
import CoinsTable from './components/CoinsTable'
import useCoinStore from './store/useCoinStore'
import { coinService } from './services/api'
import { TrendingUp, Activity, ShieldCheck, Zap, Wallet as WalletIcon, ArrowUpRight } from 'lucide-react'
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
    wallet,
    connectWallet
  } = useCoinStore()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let data = []
      // Use search API if query exists, otherwise chain or trending
      if (filters.searchQuery) {
        data = await coinService.searchPairs(filters.searchQuery)
      } else if (filters.network !== 'all') {
        data = await coinService.getPairsByChain(filters.network)
      } else {
        data = await coinService.getTrending()
      }

      // Client-side filtering for attributes the API doesn't support well in a single call
      let filteredData = data

      // Filter by Network (if search was broad)
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
        const maxAgeMs = {
          '1h': 60 * 60 * 1000,
          '6h': 6 * 60 * 60 * 1000,
          '24h': 24 * 60 * 60 * 1000,
          '7d': 7 * 24 * 60 * 60 * 1000,
        }[filters.age]
        filteredData = filteredData.filter(p => p.pairCreatedAt && (now - p.pairCreatedAt) <= maxAgeMs)
      }

      // Filter by Liquidity
      if (filters.liquidity !== 'all') {
        const minLiq = filters.liquidity === '10k' ? 10000 :
                       filters.liquidity === '100k' ? 100000 : 1000000
        filteredData = filteredData.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
      }

      // Filter by Volume (24h)
      if (filters.volume !== 'all') {
        const minVol = filters.volume === '10k' ? 10000 :
                       filters.volume === '100k' ? 100000 : 1000000
        filteredData = filteredData.filter(p => parseFloat(p.volume?.h24 || 0) >= minVol)
      }

      // Filter by Market Cap
      if (filters.marketCap !== 'all') {
        filteredData = filteredData.filter(p => {
          const mcap = p.fdv || 0
          if (filters.marketCap === 'micro') return mcap < 100000
          if (filters.marketCap === 'small') return mcap < 1000000
          if (filters.marketCap === 'mid') return mcap < 10000000
          if (filters.marketCap === 'large') return mcap >= 10000000
          return true
        })
      }

      // Filter by Verified (Mock: tokens with at least one social/website link)
      if (filters.verifiedOnly) {
        filteredData = filteredData.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0)
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

  // Stats for Dashboard
  const stats = useMemo(() => {
    const trending = coins.length
    const new24h = coins.filter(c => c.pairCreatedAt && (Date.now() - c.pairCreatedAt) < 86400000).length
    const safeCount = coins.filter(c => c.info?.websites?.length > 0 || c.info?.socials?.length > 0).length
    const safePercent = trending > 0 ? Math.round((safeCount / trending) * 100) : 0

    return {
      trending,
      new24h,
      safe: safePercent,
      volatility: 'High'
    }
  }, [coins])

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Trending Pairs" value={stats.trending.toString()} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New 24h" value={stats.new24h.toString()} icon={Zap} color="text-yellow-500" />
              <StatCard title="Safe/Verified" value={`${stats.safe}%`} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Market Volatility" value={stats.volatility} icon={Activity} color="text-red-500" />
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                <div>
                  <h2 className="text-xl font-bold">Live Market Feed</h2>
                  <p className="text-sm text-muted-foreground mt-1">Real-time discovery across {filters.network === 'all' ? 'all chains' : filters.network}</p>
                </div>
                <button
                  className="bg-primary/10 text-primary hover:bg-primary/20 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                  onClick={() => fetchData()}
                >
                  Refresh Feed
                </button>
              </div>
              <CoinsTable data={coins.slice(0, 15)} />
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
      case 'wallets':
        return (
          <div className="p-8 max-w-4xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold">Wallet Intelligence</h2>
            {wallet.isConnected ? (
               <div className="grid gap-6">
                  <div className="bg-card p-8 rounded-2xl border border-border flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <WalletIcon size={32} />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Connected Wallet</p>
                        <p className="text-2xl font-mono font-bold mt-1">{wallet.address}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Balance</p>
                      <p className="text-3xl font-bold text-primary mt-1">{wallet.balance} ETH</p>
                    </div>
                  </div>

                  <div className="bg-card rounded-2xl border border-border overflow-hidden">
                    <div className="p-6 border-b border-border font-bold text-lg bg-muted/30">Mock Portfolio</div>
                    <div className="p-12 text-center text-muted-foreground italic">
                      Portfolio tracking will be available in Phase 2.
                    </div>
                  </div>
               </div>
            ) : (
              <div className="bg-card border-2 border-dashed border-border rounded-3xl p-20 text-center space-y-6">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                  <WalletIcon size={40} />
                </div>
                <div className="max-w-xs mx-auto">
                  <h3 className="text-xl font-bold">Connect your wallet</h3>
                  <p className="text-muted-foreground mt-2">Track your assets and monitor contract performance in real-time.</p>
                </div>
                <button
                  onClick={connectWallet}
                  className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
                >
                  Connect Wallet
                </button>
              </div>
            )}
          </div>
        )
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
               <Zap size={32} />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-foreground capitalize">{view.replace('-', ' ')}</h3>
              <p className="italic">This module is part of the Phase 2 roadmap.</p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 border-b border-border flex items-center justify-between px-10 bg-card/50 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
             <div className="h-8 w-1.5 bg-primary rounded-full"></div>
             <h2 className="text-2xl font-black uppercase tracking-tighter italic">{view.replace('-', ' ')}</h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-2.5 px-4 py-1.5 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black border border-green-500/20">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
              LIVE DATA STREAM
            </div>
            {wallet.isConnected ? (
              <div className="flex items-center gap-3 bg-secondary px-4 py-2 rounded-xl border border-border">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-muted-foreground leading-none">CONNECTED</p>
                  <p className="text-xs font-mono font-bold">{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                  <ArrowUpRight size={16} />
                </div>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/25"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-background/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap size={16} className="text-primary animate-pulse" />
                </div>
              </div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Scanning Chains...</p>
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
  <div className="bg-card p-6 rounded-2xl border border-border flex items-center justify-between group hover:border-primary/50 transition-all cursor-default shadow-sm hover:shadow-md">
    <div>
      <p className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">{title}</p>
      <p className="text-3xl font-black">{value}</p>
    </div>
    <div className={cn("p-4 rounded-2xl bg-secondary group-hover:scale-110 transition-transform", color)}>
      <Icon size={28} />
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
