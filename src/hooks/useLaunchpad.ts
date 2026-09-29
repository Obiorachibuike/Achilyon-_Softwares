'use client'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { useWallet } from '@/stores/wallet'
import { getProvider } from '@/lib/wallet/registry'
import type { LaunchpadDeployment } from '@/lib/contracts/deployments'
import { createLaunchpadClient, ensureChain, readBalances, readCurve, type Eip1193 } from '@/lib/contracts/launchpad'

/**
 * Connects the active *real* wallet to a launchpad deployment. The demo
 * wallet never gets a client — it cannot sign transactions.
 */
export function useLaunchpadWallet(d: LaunchpadDeployment | null) {
  const { status, isDemo, connectorId, address, evmChainId, dispatch } = useWallet()
  const provider = status === 'connected' && !isDemo && connectorId ? (getProvider(connectorId) as Eip1193 | undefined) : undefined
  const ready = Boolean(provider && address && d)
  const onChain = ready && evmChainId === d?.evmChainId
  const client = useMemo(
    () => (provider && address && d && onChain ? createLaunchpadClient(provider, d, address) : null),
    [provider, address, d, onChain],
  )
  const switchNetwork = async () => {
    if (!provider || !d) return
    await ensureChain(provider, d.evmChainId)
    dispatch({ type: 'CHAIN_CHANGED', evmChainId: d.evmChainId })
  }
  return { provider, ready, onChain, client, address: address as Address | null, switchNetwork }
}

/** Fresh curve state and balances for one token, polled while the panel is open. */
export function useOnchainPosition(client: ReturnType<typeof useLaunchpadWallet>['client'], d: LaunchpadDeployment, token: string, account: Address | null) {
  return useQuery({
    queryKey: ['onchain-position', d.chain, token.toLowerCase(), account],
    enabled: Boolean(client && account),
    refetchInterval: 10_000,
    queryFn: async () => {
      const [curve, balances] = await Promise.all([
        readCurve(client!.publicClient, d.address, token as Address),
        readBalances(client!.publicClient, token as Address, account!),
      ])
      return { curve, balances }
    },
  })
}
