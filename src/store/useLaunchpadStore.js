import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uid, toNumber } from '../lib/utils'

export const blankDraft = () => ({
  id: uid(),
  name: '',
  symbol: '',
  chain: 'base',
  totalSupply: 1_000_000_000,
  listingPrice: 0.0001,
  liquidityUsd: 25_000,
  description: '',
  website: '',
  allocations: [
    { id: uid(), label: 'Liquidity pool', pct: 40, cliffMonths: 0, vestingMonths: 0 },
    { id: uid(), label: 'Community & airdrop', pct: 25, cliffMonths: 0, vestingMonths: 6 },
    { id: uid(), label: 'Team', pct: 15, cliffMonths: 6, vestingMonths: 24 },
    { id: uid(), label: 'Treasury', pct: 12, cliffMonths: 3, vestingMonths: 18 },
    { id: uid(), label: 'Marketing', pct: 8, cliffMonths: 0, vestingMonths: 12 },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

/** Tokenomics maths + launch-readiness checks for a draft. */
export function analyzeDraft(d) {
  const supply = toNumber(d.totalSupply)
  const price = toNumber(d.listingPrice)
  const liquidity = toNumber(d.liquidityUsd)
  const allocated = d.allocations.reduce((s, a) => s + toNumber(a.pct), 0)
  const unlockedPct = d.allocations.filter((a) => !toNumber(a.cliffMonths) && !toNumber(a.vestingMonths)).reduce((s, a) => s + toNumber(a.pct), 0)
  const fdv = supply * price
  const initialMcap = fdv * (unlockedPct / 100)
  const team = d.allocations.filter((a) => /team|founder|advisor/i.test(a.label)).reduce((s, a) => s + toNumber(a.pct), 0)
  const teamUnvested = d.allocations.some((a) => /team|founder|advisor/i.test(a.label) && !toNumber(a.vestingMonths) && toNumber(a.pct) > 0)
  const liqRatio = initialMcap > 0 ? (liquidity / initialMcap) * 100 : 0

  const checks = [
    { label: 'Allocations total 100%', ok: Math.abs(allocated - 100) < 0.001, detail: `${allocated.toFixed(2)}% allocated` },
    { label: 'Name and ticker set', ok: Boolean(d.name.trim()) && /^[A-Z0-9]{2,10}$/.test(d.symbol), detail: 'Ticker: 2–10 uppercase letters/numbers' },
    { label: 'Team allocation ≤ 20%', ok: team <= 20, detail: `${team.toFixed(1)}% to team/advisors` },
    { label: 'Team tokens vested', ok: !teamUnvested, detail: teamUnvested ? 'Some team tokens unlock at launch' : 'All team tokens vest over time' },
    { label: 'Liquidity ≥ 10% of launch mcap', ok: liqRatio >= 10, detail: `${liqRatio.toFixed(1)}% of initial market cap` },
    { label: 'Positive supply and price', ok: supply > 0 && price > 0, detail: `${supply.toLocaleString()} tokens @ $${price}` },
  ]
  return { supply, price, liquidity, allocated, unlockedPct, fdv, initialMcap, team, liqRatio, checks, ready: checks.every((c) => c.ok) }
}

const useLaunchpadStore = create(
  persist(
    (set) => ({
      drafts: [],
      save: (draft) => set((s) => {
        const next = { ...draft, updatedAt: Date.now() }
        const exists = s.drafts.some((d) => d.id === draft.id)
        return { drafts: exists ? s.drafts.map((d) => (d.id === draft.id ? next : d)) : [next, ...s.drafts] }
      }),
      remove: (id) => set((s) => ({ drafts: s.drafts.filter((d) => d.id !== id) })),
    }),
    { name: 'achilyon-launchpad', version: 1 },
  ),
)

export default useLaunchpadStore
