'use client'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { ChainId, Timeframe } from '@/types'
import { usePreferences } from '@/stores/preferences'
import { useWatchlistStore } from '@/stores/watchlist'
import { useRecentStore } from '@/stores/recent'
import { useAlertStore } from '@/stores/alerts'
import { useWallet } from '@/stores/wallet'
import { useMounted } from '@/hooks/useMounted'
import { toast } from '@/stores/toast'
import { launchpadDeployments, onchainLaunchesEnabled } from '@/lib/contracts/deployments'
import { publicConfig } from '@/lib/config'
import { FILTER_CHAINS, NETWORKS } from '@/lib/blockchain/chains'
import { shortAddress } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, Field, PageHeader, Skeleton } from '@/components/ui/primitives'
import { Segmented } from '@/components/ui/Segmented'
import { Notice } from '@/components/ui/feedback'

export function SettingsView() {
  const mounted = useMounted()
  const prefs = usePreferences()
  const wallet = useWallet()
  const watchCount = useWatchlistStore((s) => s.items.length)
  const recentCount = useRecentStore((s) => s.items.length)
  const alertCount = useAlertStore((s) => s.alerts.length)
  const [perm, setPerm] = useState<string>(() => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission))

  if (!mounted) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full rounded-2xl" /></div>

  const clearAll = () => {
    useWatchlistStore.setState({ items: [] })
    useRecentStore.getState().clear()
    useAlertStore.setState({ alerts: [] })
    localStorage.removeItem('achilyon-launch-draft')
    toast.success('Local data cleared', 'Watchlist, recently viewed, alerts and launch draft were removed from this device.')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Settings" description="Preferences are stored on this device." />
      <Card className="p-5">
        <CardHeader title="Markets" className="mb-4 p-0" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Default network" htmlFor="set-network" hint="Pre-filters lists across the app.">
            <select id="set-network" className="input" value={prefs.network} onChange={(e) => prefs.setNetwork(e.target.value as ChainId | 'all')}>
              <option value="all">All networks</option>
              {FILTER_CHAINS.map((c) => <option key={c} value={c}>{NETWORKS[c].name}</option>)}
            </select>
          </Field>
          <Field label="Default slippage" htmlFor="set-slip" hint="Used by the trading panel.">
            <select id="set-slip" className="input" value={prefs.slippageBps} onChange={(e) => prefs.setSlippage(Number(e.target.value))}>
              {[50, 100, 300, 500, 1000].map((b) => <option key={b} value={b}>{b / 100}%</option>)}
              {![50, 100, 300, 500, 1000].includes(prefs.slippageBps) && <option value={prefs.slippageBps}>{prefs.slippageBps / 100}% (custom)</option>}
            </select>
          </Field>
          <Field label="Chart timeframe" htmlFor="set-tf">
            <select id="set-tf" className="input" value={prefs.chartTimeframe} onChange={(e) => prefs.setChartTimeframe(e.target.value as Timeframe)}>
              {(['1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M'] as Timeframe[]).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <div className="space-y-1.5">
            <span className="label block">Chart style</span>
            <Segmented label="Chart style" value={prefs.chartType} onChange={prefs.setChartType} options={[{ value: 'candles', label: 'Candles' }, { value: 'line', label: 'Line' }]} />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <CardHeader title="Notifications" className="mb-3 p-0" />
        <p className="text-sm text-muted">Browser notifications for price alerts while Achilyon is open in a background tab.</p>
        <div className="mt-3 flex items-center gap-3 text-sm">
          <span>Status: <b className="capitalize">{perm}</b></span>
          {perm === 'default' && <Button size="sm" variant="primary" onClick={async () => setPerm(await Notification.requestPermission())}>Enable</Button>}
          {perm === 'denied' && <span className="text-xs text-muted">Re-enable in your browser&apos;s site settings.</span>}
        </div>
      </Card>

      <Card className="p-5">
        <CardHeader title="Wallet & session" className="mb-3 p-0" />
        {wallet.status === 'connected' && wallet.address ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div>
              <div className="font-mono">{shortAddress(wallet.address, 6)}{wallet.isDemo && <span className="ml-2 text-xs text-muted">(demo)</span>}</div>
              <div className="text-xs text-muted">{wallet.session ? `Signed in · session expires ${new Date(wallet.session.expiresAt).toLocaleString()}` : 'Connected, not signed in'}</div>
            </div>
            <Button size="sm" variant="danger" onClick={() => void wallet.disconnect()}>Disconnect & sign out</Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted">No wallet connected.</span><Button size="sm" variant="primary" onClick={wallet.openModal}>Connect</Button></div>
        )}
        <p className="mt-3 text-xs text-subtle">Achilyon never asks for your private key or seed phrase. Sign-in uses a free message signature and an httpOnly session cookie.</p>
      </Card>

      <Card className="p-5">
        <CardHeader title="Safety" className="mb-3 p-0" />
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted">Trading risk acknowledgement: <b className="text-fg">{prefs.riskAcknowledged ? 'accepted' : 'not accepted'}</b></span>
          {prefs.riskAcknowledged && <Button size="sm" onClick={() => usePreferences.setState({ riskAcknowledged: false })}>Show again</Button>}
        </div>
      </Card>

      <Card className="p-5">
        <CardHeader title="Data on this device" className="mb-3 p-0" />
        <p className="text-sm text-muted">{watchCount} watched · {recentCount} recently viewed · {alertCount} alerts</p>
        <Button className="mt-3" size="sm" variant="danger" onClick={clearAll}><Trash2 className="h-3.5 w-3.5" /> Clear local data</Button>
      </Card>

      <Notice tone={publicConfig.demoMode ? 'demo' : 'info'} title={publicConfig.demoMode ? 'Demo mode is on' : 'Live data mode'}>
        {publicConfig.demoMode ? 'Markets, trades and launches are simulated. Set NEXT_PUBLIC_DEMO_MODE=false to use live DexScreener data.' : 'Market data comes from DexScreener and GeckoTerminal.'}
        {onchainLaunchesEnabled() ? ` On-chain launchpad: ${launchpadDeployments().map((d) => `${NETWORKS[d.chain].name}${d.testnet ? ' testnet' : ''}`).join(', ')}.` : ' No on-chain launchpad is configured, so launches with a real wallet are unavailable.'}
      </Notice>
    </div>
  )
}
