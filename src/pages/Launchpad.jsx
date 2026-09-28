import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Download, ExternalLink, FilePlus2, Plus, Rocket, Save, Sparkles, Trash2, XCircle } from 'lucide-react'
import useLaunchpadStore, { analyzeDraft, blankDraft } from '../store/useLaunchpadStore'
import { dexService } from '../services/api'
import { CHAINS, chainLabel } from '../config'
import { cn, formatPrice, formatUsdCompact, timeAgo, uid } from '../lib/utils'
import { toast } from '../store/useToastStore'
import { Badge, Button, Card, CardHeader, Field, PageHeader, TokenAvatar, inputClass } from '../components/ui'

const COLORS = ['#7c8cff', '#34d399', '#f59e0b', '#f472b6', '#38bdf8', '#a78bfa', '#fb7185', '#facc15']

function AllocationDonut({ allocations }) {
  const total = allocations.reduce((s, a) => s + (Number(a.pct) || 0), 0) || 1
  let acc = 0
  const stops = allocations.map((a, i) => {
    const start = (acc / total) * 360
    acc += Number(a.pct) || 0
    return `${COLORS[i % COLORS.length]} ${start}deg ${(acc / total) * 360}deg`
  })
  return (
    <div className="relative mx-auto h-40 w-40 rounded-full" style={{ background: `conic-gradient(${stops.join(',')})` }} role="img" aria-label="Token allocation chart">
      <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-card">
        <span className="text-xs text-muted-foreground">Allocated</span>
        <span className="text-xl font-bold tabular-nums">{allocations.reduce((s, a) => s + (Number(a.pct) || 0), 0).toFixed(0)}%</span>
      </div>
    </div>
  )
}

function FreshLaunches() {
  const [items, setItems] = useState({ status: 'loading', list: [] })
  useEffect(() => {
    let cancelled = false
    dexService.getLatestProfiles()
      .then((list) => { if (!cancelled) setItems({ status: 'ready', list: list.filter((p) => p.tokenAddress).slice(0, 10) }) })
      .catch(() => { if (!cancelled) setItems({ status: 'error', list: [] }) })
    return () => { cancelled = true }
  }, [])
  return (
    <Card>
      <CardHeader title="Just launched" subtitle="Latest token profiles on DexScreener" icon={Sparkles} />
      {items.status === 'loading' && <p className="p-5 text-sm text-muted-foreground">Loading…</p>}
      {items.status === 'error' && <p className="p-5 text-sm text-muted-foreground">Couldn’t load recent launches.</p>}
      <ul className="divide-y divide-border/60">
        {items.list.map((p) => (
          <li key={`${p.chainId}-${p.tokenAddress}`} className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <TokenAvatar src={p.icon} symbol={p.tokenAddress.slice(0, 2)} size={30} />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm">{p.description || 'No description'}</p>
              <p className="text-[11px] text-muted-foreground">{chainLabel(p.chainId)} · {p.tokenAddress.slice(0, 6)}…{p.tokenAddress.slice(-4)}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Link to={`/analyzer?chain=${p.chainId}&address=${p.tokenAddress}`} className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground">Analyze</Link>
              {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="rounded-md border border-border p-1 text-muted-foreground hover:text-foreground" aria-label="Open on DexScreener"><ExternalLink size={13} /></a>}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export default function Launchpad() {
  const { drafts, save, remove } = useLaunchpadStore()
  const [draft, setDraft] = useState(() => drafts[0] ?? blankDraft())
  const a = useMemo(() => analyzeDraft(draft), [draft])
  const saved = drafts.find((d) => d.id === draft.id)
  const dirty = !saved || JSON.stringify({ ...saved, updatedAt: 0 }) !== JSON.stringify({ ...draft, updatedAt: 0 })

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  const setAlloc = (id, patch) => setDraft((d) => ({ ...d, allocations: d.allocations.map((x) => (x.id === id ? { ...x, ...patch } : x)) }))

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ ...draft, metrics: { fdv: a.fdv, initialMarketCap: a.initialMcap, circulatingAtLaunchPct: a.unlockedPct } }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${(draft.symbol || 'token').toLowerCase()}-launch-plan.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Launchpad"
        description="Plan a token launch: set supply, pricing, liquidity and vesting, then check it against common launch-readiness rules. Drafts are saved in this browser."
        actions={
          <>
            <Button onClick={() => setDraft(blankDraft())}><FilePlus2 size={15} /> New draft</Button>
            <Button onClick={exportJson}><Download size={15} /> Export JSON</Button>
            <Button variant="primary" onClick={() => { save(draft); toast({ title: 'Draft saved', description: draft.name || 'Untitled token', tone: 'success' }) }} disabled={!dirty}><Save size={15} /> {dirty ? 'Save draft' : 'Saved'}</Button>
          </>
        }
      />

      {drafts.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {drafts.map((d) => (
            <div key={d.id} className={cn('flex shrink-0 items-center gap-1 rounded-lg border px-3 py-1.5 text-sm', d.id === draft.id ? 'border-primary bg-primary/10' : 'border-border')}>
              <button type="button" onClick={() => setDraft(d)} className="font-medium">{d.symbol || d.name || 'Untitled'}</button>
              <span className="text-[11px] text-muted-foreground">· {timeAgo(d.updatedAt)}</span>
              <button type="button" onClick={() => { remove(d.id); if (d.id === draft.id) setDraft(blankDraft()) }} className="ml-1 text-muted-foreground hover:text-red-400" aria-label="Delete draft"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader title="Token details" icon={Rocket} />
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
              <Field label="Token name"><input className={inputClass} value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Achilyon Token" maxLength={40} /></Field>
              <Field label="Ticker" hint="2–10 characters, A–Z and 0–9"><input className={cn(inputClass, 'uppercase')} value={draft.symbol} onChange={(e) => set({ symbol: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) })} placeholder="ACHI" /></Field>
              <Field label="Chain">
                <select className={inputClass} value={draft.chain} onChange={(e) => set({ chain: e.target.value })}>
                  {CHAINS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Website"><input className={inputClass} type="url" value={draft.website} onChange={(e) => set({ website: e.target.value })} placeholder="https://" /></Field>
              <Field label="Total supply"><input className={inputClass} type="number" min="1" step="any" value={draft.totalSupply} onChange={(e) => set({ totalSupply: e.target.value })} /></Field>
              <Field label="Listing price (USD)"><input className={inputClass} type="number" min="0" step="any" value={draft.listingPrice} onChange={(e) => set({ listingPrice: e.target.value })} /></Field>
              <Field label="Initial liquidity (USD)" className="sm:col-span-2"><input className={inputClass} type="number" min="0" step="any" value={draft.liquidityUsd} onChange={(e) => set({ liquidityUsd: e.target.value })} /></Field>
              <Field label="Description" className="sm:col-span-2"><textarea className={cn(inputClass, 'min-h-[80px]')} value={draft.description} onChange={(e) => set({ description: e.target.value })} placeholder="What is this token for?" maxLength={500} /></Field>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Allocation & vesting"
              subtitle={`${a.allocated.toFixed(2)}% allocated · ${a.unlockedPct.toFixed(1)}% unlocked at launch`}
              action={<Button size="sm" onClick={() => set({ allocations: [...draft.allocations, { id: uid(), label: 'New bucket', pct: 0, cliffMonths: 0, vestingMonths: 0 }] })}><Plus size={13} /> Add</Button>}
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Bucket</th><th className="px-2 py-2.5 font-medium">% of supply</th><th className="px-2 py-2.5 font-medium">Cliff (mo)</th><th className="px-2 py-2.5 font-medium">Vesting (mo)</th><th className="px-2 py-2.5 text-right font-medium">Tokens</th><th />
                </tr></thead>
                <tbody>
                  {draft.allocations.map((x, i) => (
                    <tr key={x.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /><input className={cn(inputClass, 'py-1.5')} value={x.label} onChange={(e) => setAlloc(x.id, { label: e.target.value })} aria-label="Bucket name" /></div></td>
                      <td className="px-2 py-2"><input className={cn(inputClass, 'w-20 py-1.5')} type="number" min="0" max="100" step="any" value={x.pct} onChange={(e) => setAlloc(x.id, { pct: e.target.value })} aria-label="Percent" /></td>
                      <td className="px-2 py-2"><input className={cn(inputClass, 'w-20 py-1.5')} type="number" min="0" step="1" value={x.cliffMonths} onChange={(e) => setAlloc(x.id, { cliffMonths: e.target.value })} aria-label="Cliff months" /></td>
                      <td className="px-2 py-2"><input className={cn(inputClass, 'w-20 py-1.5')} type="number" min="0" step="1" value={x.vestingMonths} onChange={(e) => setAlloc(x.id, { vestingMonths: e.target.value })} aria-label="Vesting months" /></td>
                      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{formatUsdCompact((a.supply * (Number(x.pct) || 0)) / 100).replace('$', '')}</td>
                      <td className="pr-3"><button type="button" onClick={() => set({ allocations: draft.allocations.filter((y) => y.id !== x.id) })} className="p-1 text-muted-foreground hover:text-red-400" aria-label="Remove bucket"><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="p-5">
            <AllocationDonut allocations={draft.allocations} />
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-muted-foreground">Fully diluted value</dt><dd className="font-semibold tabular-nums">{formatUsdCompact(a.fdv)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Launch market cap</dt><dd className="font-semibold tabular-nums">{formatUsdCompact(a.initialMcap)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Listing price</dt><dd className="font-semibold tabular-nums">{formatPrice(a.price)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Liquidity / mcap</dt><dd className="font-semibold tabular-nums">{a.liqRatio.toFixed(1)}%</dd></div>
            </dl>
          </Card>
          <Card>
            <CardHeader title="Launch readiness" subtitle={a.ready ? 'All checks passed' : `${a.checks.filter((c) => !c.ok).length} issue(s) to resolve`} action={<Badge tone={a.ready ? 'good' : 'warn'}>{a.ready ? 'Ready' : 'Draft'}</Badge>} />
            <ul className="divide-y divide-border/60">
              {a.checks.map((c) => (
                <li key={c.label} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                  {c.ok ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-400" /> : <XCircle size={17} className="mt-0.5 shrink-0 text-red-400" />}
                  <div><p className="text-sm font-medium">{c.label}</p><p className="text-xs text-muted-foreground">{c.detail}</p></div>
                </li>
              ))}
            </ul>
            <p className="border-t border-border px-5 py-3 text-[11px] text-muted-foreground">This is a planning tool. It doesn’t deploy contracts or move funds.</p>
          </Card>
          <FreshLaunches />
        </aside>
      </div>
    </div>
  )
}
