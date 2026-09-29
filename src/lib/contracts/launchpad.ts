import {
  createPublicClient, createWalletClient, custom, defineChain, getAddress, parseEventLogs, parseSignature,
  type Address, type Chain, type Hash, type PublicClient, type TransactionReceipt, type WalletClient,
} from 'viem'
import { achilyonLaunchpadAbi, launchTokenAbi, uniswapV2MigratorAbi } from './abi'
import type { LaunchpadDeployment } from './deployments'
import { initialCurve, quoteBuyExact, type OnchainCurve } from './curveMath'
import { SlippageError, TxRevertedError, WrongNetworkError } from './errors'

/**
 * Browser/Node client for AchilyonLaunchpad over any EIP-1193 provider (an
 * injected wallet in the browser; an in-process EVM in tests).
 *
 * Every write is simulated first — contract errors surface before the wallet
 * is asked to sign — and only resolves after a mined receipt with
 * `status: 'success'`. A reverted receipt throws `TxRevertedError`.
 */

export interface Eip1193 {
  request(args: { method: string; params?: unknown }): Promise<unknown>
}

/** Launchpad ABI plus LaunchToken's errors, so token reverts decode too. */
export const launchpadAbiWithErrors = [
  ...achilyonLaunchpadAbi,
  ...launchTokenAbi.filter((x) => x.type === 'error'),
  ...uniswapV2MigratorAbi.filter((x) => x.type === 'error' || x.type === 'event'),
] as const

export interface TxHooks {
  /** The wallet is about to prompt the user (permit signature or transaction). */
  onSignatureRequest?: () => void
  /** The transaction was broadcast. */
  onSubmitted?: (hash: Hash) => void
}

export interface LaunchpadClient {
  deployment: LaunchpadDeployment
  account: Address
  publicClient: PublicClient
  walletClient: WalletClient
}

export function chainFor(d: LaunchpadDeployment): Chain {
  return defineChain({
    id: d.evmChainId,
    name: d.chain,
    nativeCurrency: { name: d.nativeSymbol, symbol: d.nativeSymbol, decimals: 18 },
    rpcUrls: { default: { http: [] } },
    blockExplorers: { default: { name: 'Explorer', url: d.explorerUrl } },
  })
}

export function createLaunchpadClient(provider: Eip1193, deployment: LaunchpadDeployment, account: string): LaunchpadClient {
  const chain = chainFor(deployment)
  // Reverts are deterministic and user rejections must surface immediately: no retries.
  const transport = custom(provider, { retryCount: 0 })
  return {
    deployment,
    account: getAddress(account),
    publicClient: createPublicClient({ chain, transport }) as PublicClient,
    walletClient: createWalletClient({ account: getAddress(account), chain, transport }),
  }
}

/** Ensures the wallet is on the deployment's chain, asking it to switch if not. */
export async function ensureChain(provider: Eip1193, evmChainId: number): Promise<void> {
  const current = Number.parseInt(String(await provider.request({ method: 'eth_chainId' })), 16)
  if (current === evmChainId) return
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${evmChainId.toString(16)}` }] })
  } catch (e) {
    if ((e as { code?: number }).code === 4001) throw e
    throw new WrongNetworkError(evmChainId)
  }
  const after = Number.parseInt(String(await provider.request({ method: 'eth_chainId' })), 16)
  if (after !== evmChainId) throw new WrongNetworkError(evmChainId)
}

export const deadlineIn = (seconds: number, now = Date.now()) => BigInt(Math.floor(now / 1000) + seconds)

// ─── Reads ──────────────────────────────────────────────────────────────────

export async function readCurve(pc: PublicClient, launchpad: Address, token: Address): Promise<OnchainCurve | null> {
  const c = await pc.readContract({ address: launchpad, abi: achilyonLaunchpadAbi, functionName: 'getCurve', args: [token] })
  if (c.creator === '0x0000000000000000000000000000000000000000') return null
  return { ...c, feeBps: Number(c.feeBps) }
}

export async function readBalances(pc: PublicClient, token: Address, owner: Address): Promise<{ native: bigint; token: bigint }> {
  const [native, bal] = await Promise.all([
    pc.getBalance({ address: owner }),
    pc.readContract({ address: token, abi: launchTokenAbi, functionName: 'balanceOf', args: [owner] }),
  ])
  return { native, token: bal }
}

export async function quoteBuy(pc: PublicClient, launchpad: Address, token: Address, quoteIn: bigint) {
  const [tokensOut, fee, refund] = await pc.readContract({ address: launchpad, abi: achilyonLaunchpadAbi, functionName: 'quoteBuy', args: [token, quoteIn] })
  return { tokensOut, fee, refund }
}

export async function quoteSell(pc: PublicClient, launchpad: Address, token: Address, amount: bigint) {
  const [quoteOut, fee] = await pc.readContract({ address: launchpad, abi: achilyonLaunchpadAbi, functionName: 'quoteSell', args: [token, amount] })
  return { quoteOut, fee }
}

// ─── Writes ─────────────────────────────────────────────────────────────────

async function confirm(pc: PublicClient, hash: Hash): Promise<TransactionReceipt> {
  const receipt = await pc.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') throw new TxRevertedError(hash)
  return receipt
}

/**
 * Exact tokens the creator's initial buy receives: the new curve's state is
 * fully determined by the launch parameters and two contract settings.
 */
export async function quoteLaunch(pc: PublicClient, launchpad: Address, p: { creator: Address; totalSupply: bigint; curveBps: number; creatorBps: number; initialBuy: bigint }): Promise<{ tokensOut: bigint; fee: bigint; feeBps: number }> {
  const [startMarketCapQuote, feeBps] = await Promise.all([
    pc.readContract({ address: launchpad, abi: achilyonLaunchpadAbi, functionName: 'startMarketCapQuote' }),
    pc.readContract({ address: launchpad, abi: achilyonLaunchpadAbi, functionName: 'feeBps' }),
  ])
  const curve = initialCurve({ ...p, startMarketCapQuote, feeBps: Number(feeBps) })
  if (p.initialBuy === 0n) return { tokensOut: 0n, fee: 0n, feeBps: Number(feeBps) }
  const q = quoteBuyExact(curve, p.initialBuy)
  return { tokensOut: q.tokensOut, fee: q.fee, feeBps: Number(feeBps) }
}

export interface LaunchParams {
  name: string
  symbol: string
  metadataURI: string
  totalSupply: bigint
  curveBps: number
  creatorBps: number
  /** Native currency spent on the creator's initial buy (0 for none). */
  initialBuy: bigint
  minTokensOut: bigint
  deadline: bigint
}

export async function launchToken(c: LaunchpadClient, p: LaunchParams, hooks: TxHooks = {}): Promise<{ hash: Hash; token: Address; tokensBought: bigint; receipt: TransactionReceipt }> {
  const { request } = await c.publicClient.simulateContract({
    account: c.account,
    address: c.deployment.address,
    abi: launchpadAbiWithErrors,
    functionName: 'createToken',
    args: [{ name: p.name, symbol: p.symbol, metadataURI: p.metadataURI, totalSupply: p.totalSupply, curveBps: p.curveBps, creatorBps: p.creatorBps }, p.minTokensOut, p.deadline],
    value: p.initialBuy,
  })
  hooks.onSignatureRequest?.()
  const hash = await c.walletClient.writeContract(request)
  hooks.onSubmitted?.(hash)
  const receipt = await confirm(c.publicClient, hash)
  const logs = parseEventLogs({ abi: achilyonLaunchpadAbi, logs: receipt.logs })
  const created = logs.find((l) => l.eventName === 'TokenCreated')
  if (!created || created.eventName !== 'TokenCreated') throw new Error('Launch confirmed but no TokenCreated event was found')
  const trade = logs.find((l) => l.eventName === 'Trade')
  return { hash, token: created.args.token, tokensBought: trade?.eventName === 'Trade' ? trade.args.tokenAmount : 0n, receipt }
}

export async function buyToken(c: LaunchpadClient, p: { token: Address; quoteIn: bigint; minTokensOut: bigint; deadline: bigint }, hooks: TxHooks = {}) {
  const { request } = await c.publicClient.simulateContract({
    account: c.account,
    address: c.deployment.address,
    abi: launchpadAbiWithErrors,
    functionName: 'buy',
    args: [p.token, p.minTokensOut, p.deadline],
    value: p.quoteIn,
  })
  hooks.onSignatureRequest?.()
  const hash = await c.walletClient.writeContract(request)
  hooks.onSubmitted?.(hash)
  const receipt = await confirm(c.publicClient, hash)
  return { hash, receipt, ...tradeFrom(receipt) }
}

/**
 * Sells back to the curve. If the launchpad's allowance is too low the user
 * signs an EIP-2612 permit (free, off-chain) and a single `sellWithPermit`
 * transaction is sent — no separate approval transaction.
 */
export async function sellToken(c: LaunchpadClient, p: { token: Address; amount: bigint; minQuoteOut: bigint; deadline: bigint }, hooks: TxHooks = {}) {
  const base = { account: c.account, address: c.deployment.address, abi: launchpadAbiWithErrors } as const
  const [allowance, balance] = await Promise.all([
    c.publicClient.readContract({ address: p.token, abi: launchTokenAbi, functionName: 'allowance', args: [c.account, c.deployment.address] }),
    c.publicClient.readContract({ address: p.token, abi: launchTokenAbi, functionName: 'balanceOf', args: [c.account] }),
  ])
  if (balance < p.amount) throw new Error('Insufficient token balance')
  let hash: Hash
  if (allowance >= p.amount) {
    const { request } = await c.publicClient.simulateContract({ ...base, functionName: 'sell', args: [p.token, p.amount, p.minQuoteOut, p.deadline] })
    hooks.onSignatureRequest?.()
    hash = await c.walletClient.writeContract(request)
  } else {
    // Validate curve state and slippage before asking for a signature (reverts with the contract error).
    const { quoteOut } = await quoteSell(c.publicClient, c.deployment.address, p.token, p.amount)
    if (quoteOut < p.minQuoteOut) throw new SlippageError()
    const [name, nonce] = await Promise.all([
      c.publicClient.readContract({ address: p.token, abi: launchTokenAbi, functionName: 'name' }),
      c.publicClient.readContract({ address: p.token, abi: launchTokenAbi, functionName: 'nonces', args: [c.account] }),
    ])
    hooks.onSignatureRequest?.()
    const signature = await c.walletClient.signTypedData({
      account: c.account,
      domain: { name, version: '1', chainId: c.deployment.evmChainId, verifyingContract: p.token },
      types: { Permit: [
        { name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' },
      ] },
      primaryType: 'Permit',
      message: { owner: c.account, spender: c.deployment.address, value: p.amount, nonce, deadline: p.deadline },
    })
    const { r, s, v, yParity } = parseSignature(signature)
    const vNum = v !== undefined ? Number(v) : yParity + 27
    const { request } = await c.publicClient.simulateContract({
      ...base, functionName: 'sellWithPermit', args: [p.token, p.amount, p.minQuoteOut, p.deadline, p.deadline, vNum, r, s],
    })
    hash = await c.walletClient.writeContract(request)
  }
  hooks.onSubmitted?.(hash)
  const receipt = await confirm(c.publicClient, hash)
  return { hash, receipt, ...tradeFrom(receipt) }
}

function tradeFrom(receipt: TransactionReceipt): { quoteAmount: bigint; tokenAmount: bigint; fee: bigint } {
  const trade = parseEventLogs({ abi: achilyonLaunchpadAbi, logs: receipt.logs, eventName: 'Trade' })[0]
  if (!trade) throw new Error('Trade confirmed but no Trade event was found')
  return { quoteAmount: trade.args.quoteAmount, tokenAmount: trade.args.tokenAmount, fee: trade.args.fee }
}

/**
 * Graduates a completed curve into its DEX pool. Permissionless: whoever
 * calls it pays the gas (pool creation makes this a heavy transaction).
 */
export async function graduateToken(c: LaunchpadClient, token: Address, hooks: TxHooks = {}) {
  const { request } = await c.publicClient.simulateContract({
    account: c.account,
    address: c.deployment.address,
    abi: launchpadAbiWithErrors,
    functionName: 'migrate',
    args: [token],
  })
  hooks.onSignatureRequest?.()
  const hash = await c.walletClient.writeContract(request)
  hooks.onSubmitted?.(hash)
  const receipt = await confirm(c.publicClient, hash)
  const [ev] = parseEventLogs({ abi: achilyonLaunchpadAbi, logs: receipt.logs, eventName: 'Migrated' })
  if (!ev) throw new TxRevertedError(hash)
  return { hash, receipt, pool: ev.args.pool, quoteAmount: ev.args.quoteAmount, tokenAmount: ev.args.tokenAmount }
}

const PAIR_ABI = [
  { type: 'function', name: 'getReserves', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint112' }, { type: 'uint112' }, { type: 'uint32' }] },
  { type: 'function', name: 'token0', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
] as const

/** The token's DEX pool address (fixed at launch; may not exist before graduation). */
export async function readPoolAddress(pc: PublicClient, token: Address): Promise<Address> {
  return pc.readContract({ address: token, abi: launchTokenAbi, functionName: 'pool' })
}

/** Reserves of a graduated token's Uniswap V2-style pool, or null if it has none. */
export async function readPoolReserves(pc: PublicClient, pool: Address, token: Address): Promise<{ tokenReserve: bigint; quoteReserve: bigint } | null> {
  const code = await pc.getCode({ address: pool })
  if (!code || code === '0x') return null
  const [[r0, r1], token0] = await Promise.all([
    pc.readContract({ address: pool, abi: PAIR_ABI, functionName: 'getReserves' }),
    pc.readContract({ address: pool, abi: PAIR_ABI, functionName: 'token0' }),
  ])
  return token0.toLowerCase() === token.toLowerCase() ? { tokenReserve: r0, quoteReserve: r1 } : { tokenReserve: r1, quoteReserve: r0 }
}
