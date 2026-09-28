import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { config } from '../config'
import { uid, toNumber } from '../lib/utils'

const key = (chainId, pairAddress) => `${chainId}:${pairAddress}`.toLowerCase()

/**
 * Paper-trading account. Market orders fill at the live DexScreener price
 * adjusted by the configured slippage, plus a flat fee (bps) on notional.
 */
const useTradeStore = create(
  persist(
    (set, get) => ({
      cash: config.paperStartingBalance,
      startingBalance: config.paperStartingBalance,
      slippageBps: 50,
      feeBps: 30,
      positions: {}, // key -> { chainId, pairAddress, symbol, quote, qty, cost }
      orders: [],

      setSlippage: (bps) => set({ slippageBps: Math.max(0, Math.min(5000, Math.round(bps))) }),

      /** Quote a market order without executing it. */
      quote: (side, pair, { usd = 0, qty = 0 } = {}) => {
        const { slippageBps, feeBps } = get()
        const mid = toNumber(pair?.priceUsd, 0)
        if (!mid) return null
        const fill = side === 'buy' ? mid * (1 + slippageBps / 10000) : mid * (1 - slippageBps / 10000)
        if (side === 'buy') {
          const fee = usd * (feeBps / 10000)
          return { fill, fee, qty: (usd - fee) / fill, notional: usd }
        }
        const notional = qty * fill
        const fee = notional * (feeBps / 10000)
        return { fill, fee, qty, notional, proceeds: notional - fee }
      },

      buy: (pair, usd) => {
        const state = get()
        const amount = toNumber(usd)
        if (amount <= 0) throw new Error('Enter an amount greater than zero.')
        if (amount > state.cash + 1e-9) throw new Error('Insufficient paper balance.')
        const q = state.quote('buy', pair, { usd: amount })
        if (!q) throw new Error('No live price available for this pair.')
        const k = key(pair.chainId, pair.pairAddress)
        const prev = state.positions[k] ?? { chainId: pair.chainId, pairAddress: pair.pairAddress, symbol: pair.baseToken?.symbol, quote: pair.quoteToken?.symbol, qty: 0, cost: 0 }
        set({
          cash: state.cash - amount,
          positions: { ...state.positions, [k]: { ...prev, qty: prev.qty + q.qty, cost: prev.cost + amount } },
          orders: [{ id: uid(), side: 'buy', chainId: pair.chainId, pairAddress: pair.pairAddress, symbol: pair.baseToken?.symbol, qty: q.qty, price: q.fill, fee: q.fee, notional: amount, at: Date.now() }, ...state.orders].slice(0, 200),
        })
        return q
      },

      sell: (pair, qty) => {
        const state = get()
        const k = key(pair.chainId, pair.pairAddress)
        const pos = state.positions[k]
        const amount = Math.min(toNumber(qty), pos?.qty ?? 0)
        if (!pos || amount <= 0) throw new Error('No position to sell.')
        const q = state.quote('sell', pair, { qty: amount })
        if (!q) throw new Error('No live price available for this pair.')
        const remaining = pos.qty - amount
        const costBasis = pos.cost * (amount / pos.qty)
        const positions = { ...state.positions }
        if (remaining <= pos.qty * 1e-9) delete positions[k]
        else positions[k] = { ...pos, qty: remaining, cost: pos.cost - costBasis }
        set({
          cash: state.cash + q.proceeds,
          positions,
          orders: [{ id: uid(), side: 'sell', chainId: pair.chainId, pairAddress: pair.pairAddress, symbol: pair.baseToken?.symbol, qty: amount, price: q.fill, fee: q.fee, notional: q.notional, realized: q.proceeds - costBasis, at: Date.now() }, ...state.orders].slice(0, 200),
        })
        return q
      },

      reset: () => set({ cash: config.paperStartingBalance, startingBalance: config.paperStartingBalance, positions: {}, orders: [] }),
    }),
    { name: 'achilyon-paper-trading', version: 1 },
  ),
)

export default useTradeStore
