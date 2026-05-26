import { Wallet, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react'
import { formatCurrency } from '../lib/utils'

const mockTransactions = [
  { id: 1, type: 'buy', token: 'PEPE', amount: '1,200,000', value: 120, time: '2 mins ago', status: 'confirmed' },
  { id: 2, type: 'sell', token: 'WETH', amount: '0.5', value: 1150, time: '15 mins ago', status: 'confirmed' },
  { id: 3, type: 'buy', token: 'MOG', amount: '50,000,000', value: 45, time: '1 hour ago', status: 'confirmed' },
]

export default function Wallets() {
  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Wallet Intelligence</h1>
          <p className="text-muted-foreground text-sm">Monitor your portfolio and track smart money moves.</p>
        </div>
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors">
          <Wallet size={18} />
          Connect Wallet
        </button>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border p-6 rounded-lg">
          <div className="text-muted-foreground text-sm font-medium uppercase mb-2">Total Balance</div>
          <div className="text-3xl font-bold">{formatCurrency(0)}</div>
          <div className="text-green-500 text-sm mt-2 font-medium">+0.00% (24h)</div>
        </div>
        <div className="bg-card border border-border p-6 rounded-lg">
          <div className="text-muted-foreground text-sm font-medium uppercase mb-2">Net Profit</div>
          <div className="text-3xl font-bold">{formatCurrency(0)}</div>
          <div className="text-muted-foreground text-sm mt-2 font-medium">Across all assets</div>
        </div>
        <div className="bg-card border border-border p-6 rounded-lg">
          <div className="text-muted-foreground text-sm font-medium uppercase mb-2">Active Alerts</div>
          <div className="text-3xl font-bold">0</div>
          <div className="text-primary text-sm mt-2 font-medium cursor-pointer hover:underline">Manage alerts</div>
        </div>
      </div>

      {/* Transaction Monitoring */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-bold">Recent Transactions</h2>
          <button className="text-primary text-sm font-medium hover:underline">View all</button>
        </div>
        <div className="divide-y divide-border">
          {mockTransactions.map((tx) => (
            <div key={tx.id} className="px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-2 rounded-full",
                  tx.type === 'buy' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                )}>
                  {tx.type === 'buy' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                </div>
                <div>
                  <div className="font-bold">
                    {tx.type === 'buy' ? 'Bought' : 'Sold'} {tx.token}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock size={12} />
                    {tx.time}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">{tx.amount} {tx.token}</div>
                <div className="text-sm text-muted-foreground">{formatCurrency(tx.value)}</div>
              </div>
            </div>
          ))}
          {mockTransactions.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              No recent transactions found.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ')
}
