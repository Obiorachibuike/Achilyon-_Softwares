import { createHardhatRuntimeEnvironment } from 'hardhat/hre'
import { createPublicClient, createWalletClient, custom, defineChain, getAddress, getContractAddress, keccak256, type Abi, type Address, type Hex, type PublicClient } from 'viem'
import factoryArtifact from '@uniswap/v2-core/build/UniswapV2Factory.json'
import pairArtifact from '@uniswap/v2-core/build/UniswapV2Pair.json'
import { compile, type CompiledContract } from '../../contracts/tooling/compile.mjs'
import type { Eip1193 } from '@/lib/contracts/launchpad'
import type { LaunchpadDeployment } from '@/lib/contracts/deployments'

/**
 * In-process EVM (Hardhat EDR, Cancun) for contract and client tests. No
 * network, no binaries to download. Accounts are unlocked and pre-funded.
 */
export const CHAIN_ID = 31337
export const testChain = defineChain({ id: CHAIN_ID, name: 'test', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [] } } })

let compiled: Record<string, CompiledContract> | null = null
export function artifacts() {
  compiled ??= compile({ includeTests: true }).contracts
  return compiled
}

export async function startChain() {
  const hre = await createHardhatRuntimeEnvironment(
    { networks: { sim: { type: 'edr-simulated', chainType: 'l1', hardfork: 'cancun', chainId: CHAIN_ID } } },
    {},
    process.cwd(),
  )
  const conn = await hre.network.connect('sim')
  const provider = conn.provider as unknown as Eip1193
  const accounts = ((await provider.request({ method: 'eth_accounts' })) as string[]).map((a) => getAddress(a))
  const publicClient = createPublicClient({ chain: testChain, transport: custom(provider, { retryCount: 0 }) }) as PublicClient
  const wallet = (account: Address) => createWalletClient({ account, chain: testChain, transport: custom(provider, { retryCount: 0 }) })

  /** Deploys raw creation bytecode (e.g. third-party artifacts such as Uniswap V2). */
  async function deployBytecode(abi: Abi, bytecode: Hex, args: readonly unknown[] = [], from: Address = accounts[0]!, value = 0n): Promise<Address> {
    const hash = await wallet(from).deployContract({ abi, bytecode, args, value })
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    if (receipt.status !== 'success' || !receipt.contractAddress) throw new Error('Deployment failed')
    return getAddress(receipt.contractAddress)
  }

  async function deploy(name: string, args: readonly unknown[] = [], from: Address = accounts[0]!, value = 0n): Promise<Address> {
    const a = artifacts()[name]
    if (!a) throw new Error(`Unknown contract ${name}`)
    return deployBytecode(a.abi as Abi, a.bytecode, args, from, value)
  }

  const now = async () => (await publicClient.getBlock()).timestamp
  const increaseTime = async (seconds: number) => {
    await provider.request({ method: 'evm_increaseTime', params: [seconds] })
    await provider.request({ method: 'evm_mine', params: [] })
  }
  const setBalance = (address: Address, wei: bigint) => provider.request({ method: 'hardhat_setBalance', params: [address, `0x${wei.toString(16)}` as Hex] })

  return { provider, accounts, publicClient, wallet, deploy, deployBytecode, now, increaseTime, setBalance, close: () => conn.close() }
}

export type TestChain = Awaited<ReturnType<typeof startChain>>

/** ≈ $5K at $3,200/ETH, matching the app's default curve. */
export const START_MCAP = 1_562_500_000_000_000_000n

/** Deploys a launchpad. The migrator defaults to a recording MockMigrator. */
export async function deployLaunchpad(chain: TestChain, opts: { feeBps?: number; owner?: Address; feeRecipient?: Address; migrator?: Address } = {}) {
  const owner = opts.owner ?? chain.accounts[0]!
  const feeRecipient = opts.feeRecipient ?? chain.accounts[9]!
  const migrator = opts.migrator ?? (await chain.deploy('MockMigrator'))
  const address = await chain.deploy('AchilyonLaunchpad', [owner, feeRecipient, START_MCAP, opts.feeBps ?? 100, migrator])
  const deployment: LaunchpadDeployment = { chain: 'base', address, evmChainId: CHAIN_ID, startBlock: 0n, explorerUrl: 'https://example.invalid', testnet: true, nativeSymbol: 'ETH', dexName: 'Uniswap V2' }
  return { address, deployment, owner, feeRecipient, migrator }
}

const hex = (b: string) => `0x${b.replace(/^0x/, '')}` as Hex
/** Official Uniswap V2 build artifacts (same bytecode as mainnet). */
export const UNISWAP = {
  factoryAbi: factoryArtifact.abi as Abi,
  factoryBytecode: hex(factoryArtifact.bytecode),
  pairAbi: pairArtifact.abi as Abi,
  pairInitCodeHash: keccak256(hex(pairArtifact.bytecode)),
}

/**
 * Real Uniswap V2 factory + test WETH + launchpad wired to a UniswapV2Migrator,
 * deploying the migrator at its predicted address like contracts:deploy does.
 */
export async function deployWithUniswap(chain: TestChain, opts: { factory?: Address; weth?: Address; initCodeHash?: Hex; feeBps?: number } = {}) {
  const deployer = chain.accounts[0]!
  const factory = opts.factory ?? (await chain.deployBytecode(UNISWAP.factoryAbi, UNISWAP.factoryBytecode, [deployer]))
  const weth = opts.weth ?? (await chain.deploy('TestWETH'))
  const nonce = await chain.publicClient.getTransactionCount({ address: deployer })
  const predicted = getContractAddress({ from: deployer, nonce: BigInt(nonce + 1) })
  const { address, deployment, owner, feeRecipient } = await deployLaunchpad(chain, { migrator: predicted, feeBps: opts.feeBps })
  const migrator = await chain.deploy('UniswapV2Migrator', [address, factory, weth, opts.initCodeHash ?? UNISWAP.pairInitCodeHash])
  if (migrator !== predicted) throw new Error('Migrator address prediction failed')
  return { address, deployment, owner, feeRecipient, migrator, factory, weth }
}
