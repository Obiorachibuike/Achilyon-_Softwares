import { useEffect, useCallback, useMemo } from 'react'
import Sidebar from './components/Sidebar'
import FiltersBar from './components/FiltersBar'
import CoinsTable from './components/CoinsTable'
import useCoinStore from './store/useCoinStore'
import { coinService } from './services/api'
import { calculateTrendingScore } from './lib/trending'
import { TrendingUp, Activity, ShieldCheck, Zap, Wallet as WalletIcon } from 'lucide-react'
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
    connectWallet,
    disconnectWallet
  } = useCoinStore()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let data = []
      if (filters.network !== 'all') {
        data = await coinService.getPairsByChain(filters.network)
      } else {
        data = await coinService.getTrending()
      }

      // Apply client-side filters
      let filteredData = [...data]

      // Filter by DEX
      if (filters.dex !== 'all') {
        filteredData = filteredData.filter(p =>
          p.dexId?.toLowerCase() === filters.dex.toLowerCase() ||
          p.labels?.some(l => l.toLowerCase() === filters.dex.toLowerCase())
        )
      }

      // Filter by Age
      if (filters.age !== 'all') {
        const now = Date.now()
        const oneHour = 3600000
        const sixHours = oneHour * 6
        const twentyFourHours = oneHour * 24
        const sevenDays = twentyFourHours * 7

        filteredData = filteredData.filter(p => {
          if (!p.pairCreatedAt) return false
          const age = now - p.pairCreatedAt
          if (filters.age === '< 1h') return age < oneHour
          if (filters.age === '< 6h') return age < sixHours
          if (filters.age === '< 24h') return age < twentyFourHours
          if (filters.age === '< 7d') return age < sevenDays
          return true
        })
      }

      // Filter by Liquidity
      if (filters.liquidity !== 'all') {
        const minLiq = filters.liquidity.includes('10k') ? 10000 :
                       filters.liquidity.includes('100k') ? 100000 : 1000000
        filteredData = filteredData.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
      }

      // Filter by Volume
      if (filters.volume !== 'all') {
        const minVol = 10000 // Mock threshold
        if (filters.volume === '1h Volume') {
          filteredData = filteredData.filter(p => parseFloat(p.volume?.h1 || 0) >= minVol)
        } else if (filters.volume === '24h Volume') {
          filteredData = filteredData.filter(p => parseFloat(p.volume?.h24 || 0) >= minVol * 10)
        }
      }

      // Filter by Market Cap
      if (filters.marketCap !== 'all') {
        filteredData = filteredData.filter(p => {
          const mcap = p.fdv || 0
          if (filters.marketCap === 'Micro Cap') return mcap < 100000
          if (filters.marketCap === 'Small Cap') return mcap >= 100000 && mcap < 1000000
          if (filters.marketCap === 'Mid Cap') return mcap >= 1000000 && mcap < 10000000
          if (filters.marketCap === 'Large Cap') return mcap >= 10000000
          return true
        })
      }

      // Filter by Verified
      if (filters.verified) {
        filteredData = filteredData.filter(p => p.info?.websites?.length > 0 || p.info?.socials?.length > 0)
      }

      // Filter by Search Query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase()
        filteredData = filteredData.filter(p =>
          p.baseToken?.symbol?.toLowerCase().includes(query) ||
          p.baseToken?.name?.toLowerCase().includes(query) ||
          p.baseToken?.address?.toLowerCase().includes(query) ||
          p.pairAddress?.toLowerCase().includes(query)
        )
      }

      // Sort Data
      filteredData.sort((a, b) => {
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
    const trendingCount = coins.filter(c => calculateTrendingScore(c) > 100).length
    const new24hCount = coins.filter(c => (Date.now() - (c.pairCreatedAt || 0)) < 86400000).length
    const safeCount = coins.filter(c => c.info?.websites?.length > 0).length
    const safePercent = coins.length > 0 ? Math.round((safeCount / coins.length) * 100) : 0

    return {
      trending: trendingCount,
      new24h: new24hCount,
      safe: `${safePercent}%`,
      volatility: coins.length > 50 ? 'High' : 'Medium'
    }
  }, [coins])

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Trending Pairs" value={stats.trending.toString()} icon={TrendingUp} color="text-blue-500" />
              <StatCard title="New Listings (24h)" value={stats.new24h.toString()} icon={Zap} color="text-yellow-500" />
              <StatCard title="Verified Pairs" value={stats.safe} icon={ShieldCheck} color="text-green-500" />
              <StatCard title="Market Volatility" value={stats.volatility} icon={Activity} color="text-red-500" />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Activity size={20} className="text-primary" />
                  Live Market Discovery
                </h2>
                <button
                  className="text-xs font-bold uppercase tracking-wider bg-secondary px-3 py-1 rounded hover:bg-muted transition-colors"
                  onClick={() => fetchData()}
                >
                  Refresh
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
            <div className="p-4 bg-secondary rounded-full">
               <Zap size={48} className="text-muted-foreground/20" />
            </div>
            <p className="italic text-lg">{view.charAt(0).toUpperCase() + view.slice(1)} view is under development...</p>
          </div>
        )
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-card/50 backdrop-blur-md sticky top-0 z-20">
          <div className="flex flex-col">
             <h2 className="text-lg font-bold capitalize tracking-tight">{view}</h2>
             <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">System Operational</span>
             </div>
          </div>

          <div className="flex items-center gap-6">
            {wallet.isConnected && (
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs font-bold text-foreground">{wallet.balance} ETH</span>
                <span className="text-[10px] text-muted-foreground font-mono">{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</span>
              </div>
            )}

            <button
              onClick={wallet.isConnected ? disconnectWallet : connectWallet}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                wallet.isConnected
                  ? "bg-secondary text-foreground hover:bg-destructive/10 hover:text-destructive border border-border"
                  : "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20"
              )}
            >
              <WalletIcon size={16} />
              {wallet.isConnected ? 'Disconnect' : 'Connect Wallet'}
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-muted/10">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Synchronizing Data...</p>
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
  <div className="bg-card p-6 rounded-xl border border-border flex items-center justify-between hover:border-primary/50 transition-colors shadow-sm">
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{title}</p>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
    </div>
    <div className={cn("p-3 rounded-xl bg-secondary/50", color)}>
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
