import { useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import useCoinStore from './store/useCoinStore'
import { coinService } from './services/api'
import DashboardView from './views/DashboardView'
import CoinsView from './views/CoinsView'
import WalletsView from './views/WalletsView'

const App = () => {
  const { view, setCoins, loading, setLoading, setError, filters } = useCoinStore()

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
      let filteredData = data

      // Filter by DEX
      if (filters.dex !== 'all') {
        filteredData = filteredData.filter(p => p.dexId?.toLowerCase().includes(filters.dex))
      }

      // Filter by Liquidity
      if (filters.liquidity !== 'all') {
        const minLiq = filters.liquidity.includes('10k') ? 10000 :
                       filters.liquidity.includes('100k') ? 100000 : 1000000
        filteredData = filteredData.filter(p => parseFloat(p.liquidity?.usd || 0) >= minLiq)
      }

      // Filter by Age
      if (filters.age !== 'all') {
        const now = Date.now()
        const maxAgeHours = filters.age.includes('1h') ? 1 :
                           filters.age.includes('6h') ? 6 :
                           filters.age.includes('24h') ? 24 : 24 * 7
        filteredData = filteredData.filter(p => (now - p.pairCreatedAt) / (1000 * 60 * 60) <= maxAgeHours)
      }

      // Filter by Market Cap
      if (filters.marketCap !== 'all') {
        filteredData = filteredData.filter(p => {
          const mcap = p.fdv || 0
          if (filters.marketCap.includes('micro')) return mcap < 1000000
          if (filters.marketCap.includes('small')) return mcap < 10000000
          if (filters.marketCap.includes('mid')) return mcap < 100000000
          if (filters.marketCap.includes('large')) return mcap >= 100000000
          return true
        })
      }

      // Filter by Volume
      if (filters.volume !== 'all') {
        const minVol = filters.volume.includes('10k') ? 10000 :
                       filters.volume.includes('100k') ? 100000 :
                       filters.volume.includes('1m') ? 1000000 : 10000000
        filteredData = filteredData.filter(p => (p.volume?.h24 || 0) >= minVol)
      }

      // Filter by Verified
      if (filters.verified) {
        filteredData = filteredData.filter(p => p.info?.imageUrl || p.info?.socials?.length > 0)
      }

      // Filter by Search Query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase()
        filteredData = filteredData.filter(p =>
          p.baseToken?.name?.toLowerCase().includes(query) ||
          p.baseToken?.symbol?.toLowerCase().includes(query) ||
          p.baseToken?.address?.toLowerCase().includes(query)
        )
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
        return <DashboardView fetchData={fetchData} />
      case 'coins':
        return <CoinsView />
      case 'wallets':
        return <WalletsView />
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

export default App
