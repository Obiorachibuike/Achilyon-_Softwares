import { useEffect, useCallback, useMemo } from 'react'
import Sidebar from './components/Sidebar'
import FiltersBar from './components/FiltersBar'
import CoinsTable from './components/CoinsTable'
import useCoinStore from './store/useCoinStore'
import { coinService } from './services/api'
import { TrendingUp, Activity, ShieldCheck, Zap, Wallet as WalletIcon } from 'lucide-react'
import { cn, formatCompactNumber } from './lib/utils'
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

      // Network filter (secondary check if search was used)
      if (filters.network !== 'all') {
        filteredData = filteredData.filter(p => p.chainId === filters.network)
      }

      // DEX filter
      if (filters.dex !== 'all') {
        filteredData = filteredData.filter(p => p.dexId?.toLowerCase() === filters.dex)
      }

      // Liquidity filter
      if (filters.liquidity !== 'all') {
        const minLiq = filters.liquidity.includes('10k') ? 10000 :
                       filters.liquidity.includes('100k') ? 100000 : 1000000
        filteredData = filteredData.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
      }

      // MCAP filter
      if (filters.marketCap !== 'all') {
        filteredData = filteredData.filter(p => {
          const fdv = parseFloat(p.fdv || 0)
          if (filters.marketCap === 'micro') return fdv < 1000000
          if (filters.marketCap === 'small') return fdv >= 1000000 && fdv < 10000000
          if (filters.marketCap === 'mid') return fdv >= 10000000 && fdv < 100000000
          if (filters.marketCap === 'large') return fdv >= 100000000
          return true
        })
      }

      // Age filter
      if (filters.age !== 'all') {
        const maxAgeHours = filters.age === '1h' ? 1 :
                            filters.age === '6h' ? 6 :
                            filters.age === '24h' ? 24 : 168 // 7d
        filteredData = filteredData.filter(p => {
          if (!p.pairCreatedAt) return false
          const ageHours = (Date.now() - p.pairCreatedAt) / 1000 / 60 / 60
          return ageHours <= maxAgeHours
        })
      }

      // Verified filter (simple heuristic: has socials or website)
      if (filters.verified) {
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

  const stats = useMemo(() => {
    const trending = coins.length
    const new24h = coins.filter(c => (Date.now() - (c.pairCreatedAt || 0)) < 86400000).length
    const verifiedCount = coins.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0).length
    const safePercent = coins.length > 0 ? Math.round((verifiedCount / coins.length) * 100) : 0

    return [
      { title: "Trending Pairs", value: trending.toLocaleString(), icon: TrendingUp, color: "text-blue-500" },
      { title: "New (24h)", value: new24h.toString(), icon: Zap, color: "text-yellow-500" },
      { title: "Verified", value: `${safePercent}%`, icon: ShieldCheck, color: "text-green-500" },
      { title: "Total Volume", value: `$${formatCompactNumber(coins.reduce((acc, c) => acc + parseFloat(c.volume?.h24 || 0), 0))}`, icon: Activity, color: "text-red-500" }
    ]
  }, [coins])

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map(stat => (
                <StatCard key={stat.title} {...stat} />
              ))}
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                   <Activity size={16} className="text-primary" />
                   Market Activity
                </h2>
                <button className="text-xs font-medium text-primary hover:bg-primary/10 px-2 py-1 rounded transition-colors" onClick={() => fetchData()}>Refresh Feed</button>
              </div>
              <CoinsTable data={coins.slice(0, 15)} />
            </div>
          </div>
        )
      case 'coins':
        return (
          <div className="flex flex-col h-full overflow-hidden">
            <FiltersBar />
            <div className="flex-1 overflow-auto bg-card">
              <CoinsTable data={coins} />
            </div>
          </div>
        )
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
            <div className="p-4 rounded-full bg-secondary">
               <Activity size={48} className="opacity-20" />
            </div>
            <p className="italic">{view.charAt(0).toUpperCase() + view.slice(1).replace('-', ' ')} view is currently being indexed...</p>
          </div>
        )
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-card/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4">
             <h2 className="text-lg font-black uppercase tracking-tighter">{view}</h2>
             <div className="flex items-center gap-2 px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold border border-primary/20">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
              LIVE DATA
            </div>
          </div>

          <div className="flex items-center gap-4">
            {address ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase">Balance</p>
                  <p className="text-sm font-bold">{balance} ETH</p>
                </div>
                <div className="flex items-center gap-2 bg-secondary px-3 py-2 rounded-lg border border-border">
                   <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                   <span className="text-xs font-mono">{address.slice(0, 6)}...{address.slice(-4)}</span>
                </div>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
              >
                <WalletIcon size={16} />
                Connect Wallet
              </button>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-muted/10">
          {loading && coins.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground animate-pulse font-medium">Synchronizing with network...</p>
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
  <div className="bg-card p-5 rounded-xl border border-border flex items-center justify-between hover:border-primary/50 transition-colors cursor-default group shadow-sm">
    <div>
      <p className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
    <div className={cn("p-3 rounded-xl bg-secondary group-hover:scale-110 transition-transform", color)}>
      <Icon size={20} />
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
