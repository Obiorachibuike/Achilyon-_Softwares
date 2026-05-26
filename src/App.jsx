import { Layout } from './components/Layout'
import { TopFiltersBar } from './components/TopFiltersBar'
import { CoinsTable } from './components/CoinsTable'
import { AISummary } from './components/AISummary'
import Wallets from './views/Wallets'
import useCoinStore from './store/useCoinStore'

function App() {
  const { activeView, coins } = useCoinStore()

  const renderContent = () => {
    switch (activeView) {
      case 'coins':
      case 'trending':
        return (
          <div className="flex-1 flex flex-col overflow-hidden p-6">
            <h1 className="text-2xl font-bold mb-2 uppercase tracking-tight">
              {activeView === 'trending' ? 'Trending Tokens' : 'Coin Discovery'}
            </h1>
            <p className="text-muted-foreground text-sm mb-6">
              Real-time on-chain discovery engine. Discover new opportunities across multiple chains.
            </p>

            {activeView === 'trending' && coins.length > 0 && (
              <AISummary pair={coins[0]} />
            )}

            <div className="bg-card border border-border rounded-lg flex-1 flex flex-col overflow-hidden shadow-sm">
              <TopFiltersBar />
              <CoinsTable />
            </div>
          </div>
        )
      case 'wallets':
        return <Wallets />
      default:
        return (
          <div className="flex-1 flex items-center justify-center flex-col gap-4">
            <h1 className="text-4xl font-bold text-muted uppercase">{activeView}</h1>
            <p className="text-muted-foreground">This section is currently under development.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
            >
              Go Back
            </button>
          </div>
        )
    }
  }

  return (
    <Layout>
      {renderContent()}
    </Layout>
  )
}

export default App
