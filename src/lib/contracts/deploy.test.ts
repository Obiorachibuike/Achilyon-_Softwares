import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { custom, keccak256, parseEther, type Abi, type Address, type Hex } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import factoryArtifact from '@uniswap/v2-core/build/UniswapV2Factory.json'
import pairArtifact from '@uniswap/v2-core/build/UniswapV2Pair.json'
import { deployLaunchpad, parseConfig, DeployConfigError, UNISWAP_V2_INIT_CODE_HASH } from '../../../contracts/tooling/deploy.mjs'
import { achilyonLaunchpadAbi, uniswapV2MigratorAbi } from './abi'
import { parseDeployments } from './deployments'
import { startChain, type TestChain } from '@/test/evm'

const hex = (b: string) => `0x${b.replace(/^0x/, '')}` as Hex
let chain: TestChain
let factory: Address, weth: Address
const key = generatePrivateKey()
const deployer = privateKeyToAccount(key)
const env = (o: Record<string, string | undefined> = {}) => ({
  CHAIN: 'base', DEPLOYER_PRIVATE_KEY: key, RPC_URL: 'http://unused', START_MCAP: '1.5625', EVM_CHAIN_ID: '31337',
  DEX_FACTORY: factory, WRAPPED_NATIVE: weth, ...o,
})
const nonce = () => chain.publicClient.getTransactionCount({ address: deployer.address })

beforeAll(async () => {
  chain = await startChain()
  await chain.setBalance(deployer.address, parseEther('10'))
  factory = await chain.deployBytecode(factoryArtifact.abi as Abi, hex(factoryArtifact.bytecode), [chain.accounts[0]!])
  weth = await chain.deploy('TestWETH')
})
afterAll(() => chain?.close())

describe('contracts:deploy', () => {
  it('uses the real Uniswap V2 init-code hash by default', () => {
    expect(keccak256(hex(pairArtifact.bytecode))).toBe(UNISWAP_V2_INIT_CODE_HASH)
  })

  it('validates configuration before touching the network', () => {
    expect(() => parseConfig(env({ CHAIN: 'solana' }))).toThrow(DeployConfigError)
    expect(() => parseConfig(env({ DEPLOYER_PRIVATE_KEY: '0x1234' }))).toThrow(/32-byte/)
    expect(() => parseConfig(env({ FEE_BPS: '201' }))).toThrow(/FEE_BPS/)
    expect(() => parseConfig(env({ START_MCAP: undefined }))).toThrow(/START_MCAP/)
    expect(() => parseConfig(env({ START_MCAP: 'abc' }))).toThrow(/decimal/)
    expect(() => parseConfig(env({ FEE_RECIPIENT: '0x0000000000000000000000000000000000000000' }))).toThrow(/zero address/)
    expect(() => parseConfig(env({ EVM_CHAIN_ID: '84532' }))).toThrow(/TESTNET=true/)
    expect(() => parseConfig(env({ DEX_FACTORY: undefined }))).toThrow(/DEX_ROUTER/)
    expect(parseConfig(env({ DEX_FACTORY: undefined, WRAPPED_NATIVE: undefined, DEX_ROUTER: weth })).dexRouter).toBe(weth)
    expect(() => parseConfig(env({ PAIR_INIT_CODE_HASH: '0x12' }))).toThrow(/32-byte/)
    const c = parseConfig(env({ EVM_CHAIN_ID: '84532', TESTNET: 'true', EXPLORER_URL: 'https://sepolia.basescan.org' }), ['--dry-run'])
    expect(c).toMatchObject({ owner: deployer.address, feeRecipient: deployer.address, feeBps: 100, testnet: true, dryRun: true, startMarketCapQuote: parseEther('1.5625'), dexName: 'Uniswap V2', pairInitCodeHash: UNISWAP_V2_INIT_CODE_HASH })
  })

  it('refuses a mismatched chain id or missing DEX contracts, and sends nothing on a dry run', async () => {
    await expect(deployLaunchpad(parseConfig(env({ EVM_CHAIN_ID: '8453' })), custom(chain.provider))).rejects.toThrow(/expected 8453/)
    await expect(deployLaunchpad(parseConfig(env({ DEX_FACTORY: chain.accounts[3]! })), custom(chain.provider))).rejects.toThrow(/no contract code/)
    const before = await nonce()
    const lines: string[] = []
    expect(await deployLaunchpad(parseConfig(env(), ['--dry-run']), custom(chain.provider), (m) => lines.push(m))).toBeNull()
    expect(await nonce()).toBe(before)
    const out = lines.join('\n')
    expect(out).toMatch(/Dry run/)
    expect(out).toMatch(/NOT verifiable/) // fresh factory: no pair to check the hash against
    expect(out).not.toContain(key.slice(2))
  })

  it('deploys launchpad + migrator wired together and emits an env entry the app accepts', async () => {
    const feeRecipient = chain.accounts[5]!
    const res = (await deployLaunchpad(parseConfig(env({ FEE_RECIPIENT: feeRecipient, FEE_BPS: '150' })), custom(chain.provider)))!
    const { entry, migrator } = res
    const read = (address: Address, abi: Abi, functionName: string) => chain.publicClient.readContract({ address, abi, functionName })
    expect(await read(entry.address, achilyonLaunchpadAbi as Abi, 'owner')).toBe(deployer.address)
    expect(await read(entry.address, achilyonLaunchpadAbi as Abi, 'feeRecipient')).toBe(feeRecipient)
    expect(await read(entry.address, achilyonLaunchpadAbi as Abi, 'feeBps')).toBe(150)
    expect(await read(entry.address, achilyonLaunchpadAbi as Abi, 'migrator')).toBe(migrator)
    expect(await read(migrator, uniswapV2MigratorAbi as Abi, 'launchpad')).toBe(entry.address)
    expect(await read(migrator, uniswapV2MigratorAbi as Abi, 'factory')).toBe(factory)
    expect(await read(migrator, uniswapV2MigratorAbi as Abi, 'wrappedNative')).toBe(weth)

    const parsed = parseDeployments(JSON.stringify({ base: entry }))
    expect(parsed.base).toMatchObject({ address: entry.address, evmChainId: 31337, startBlock: BigInt(entry.startBlock), dexName: 'Uniswap V2' })
  })

  it('resolves the factory and wrapped native token from a Router02', async () => {
    const router = await chain.deploy('MockRouter', [factory, weth])
    const lines: string[] = []
    await deployLaunchpad(parseConfig(env({ DEX_FACTORY: undefined, WRAPPED_NATIVE: undefined, DEX_ROUTER: router }), ['--dry-run']), custom(chain.provider), (m) => lines.push(m))
    expect(lines.join('\n')).toContain(`factory ${factory} · wrapped native ${weth}`)
    await expect(deployLaunchpad(parseConfig(env({ DEX_ROUTER: router, WRAPPED_NATIVE: chain.accounts[4]! }), ['--dry-run']), custom(chain.provider))).rejects.toThrow(/does not match the router/)
  })

  it('aborts before sending anything when the init-code hash does not match the factory', async () => {
    // Give the factory a pair so the hash becomes checkable.
    const other = await chain.deploy('TestWETH')
    await chain.wallet(chain.accounts[0]!).writeContract({ address: factory, abi: factoryArtifact.abi as Abi, functionName: 'createPair', args: [weth, other], account: chain.accounts[0]!, chain: chain.publicClient.chain })
    const before = await nonce()
    await expect(deployLaunchpad(parseConfig(env({ PAIR_INIT_CODE_HASH: keccak256('0xdead') })), custom(chain.provider))).rejects.toThrow(/PAIR_INIT_CODE_HASH/)
    expect(await nonce()).toBe(before)
    const lines: string[] = []
    await deployLaunchpad(parseConfig(env(), ['--dry-run']), custom(chain.provider), (m) => lines.push(m))
    expect(lines.join('\n')).toMatch(/verified against an existing pair/)
  })
})
